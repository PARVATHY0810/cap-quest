const mongoose = require("mongoose");
const path = require('path'); 
const User = require("../../models/userSchema"); 
const Order = require("../../models/orderSchema"); 
const Product = require("../../models/productSchema"); 
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");


const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      
      const totalUsers = await User.countDocuments({ isAdmin: false });
      const totalProducts = await Product.countDocuments();
      const totalOrders = await Order.countDocuments();

      
      const orders = await Order.find();
      const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
      const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0),0);

      
      const previousMonthStart = new Date();
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
      previousMonthStart.setDate(1);
      previousMonthStart.setHours(0, 0, 0, 0);
      
      const previousMonthEnd = new Date();
      previousMonthEnd.setDate(0);
      previousMonthEnd.setHours(23, 59, 59, 999);
      
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      // Get counts for previous month
      const prevMonthUsers = await User.countDocuments({ 
        isAdmin: false, 
        createdOn: { $lt: currentMonthStart } 
      });
      
      const prevMonthProducts = await Product.countDocuments({ 
        createdAt: { $lt: currentMonthStart } 
      });
      
      const prevMonthOrders = await Order.countDocuments({ 
        orderDate: { $gte: previousMonthStart, $lte: previousMonthEnd } 
      });
      
      
      const prevMonthRevenue = (await Order.find({ 
        orderDate: { $gte: previousMonthStart, $lte: previousMonthEnd } 
      })).reduce((sum, order) => sum + (order.finalAmount || 0), 0);

      
      const totalUsersGrowth = prevMonthUsers > 0 ? ((totalUsers - prevMonthUsers) / prevMonthUsers * 100).toFixed(1) : 5.3;
      const totalProductsGrowth = prevMonthProducts > 0 ? ((totalProducts - prevMonthProducts) / prevMonthProducts * 100).toFixed(1) : 7.1;
      
      const currentMonthOrders = await Order.countDocuments({
        orderDate: { $gte: currentMonthStart }
      });
      const totalOrdersGrowth = prevMonthOrders > 0 ? ((currentMonthOrders / prevMonthOrders * 100) - 100).toFixed(1) : 3.2;
      
      const currentMonthRevenue = (await Order.find({
        orderDate: { $gte: currentMonthStart }
      })).reduce((sum, order) => sum + (order.finalAmount || 0), 0);
      const totalRevenueGrowth = prevMonthRevenue > 0 ? ((currentMonthRevenue / prevMonthRevenue * 100) - 100).toFixed(1) : 8.9;

      // Get recent orders with populated data
      const recentOrders = await Order.find()
        .populate("userId", "name email")
        .populate("orderedItems.product", "productName")
        .sort({ orderDate: -1 })
        .limit(5);

      
      const formattedRecentOrders = recentOrders.map((order) => ({
        orderId: order.orderId,
        customerName: order.userId ? order.userId.name : "Unknown Customer",
        productName:
          order.orderedItems.length > 0 && order.orderedItems[0].product
            ? order.orderedItems[0].product.productName
            : "Unknown Product",
        amount: order.finalAmount,
        status: order.orderedItems[0]?.status || "Processing",
        date: order.orderDate.toLocaleDateString(),
      }));

    
      const monthlyData = await getMonthlyData();
      const { revenueData, ordersData, chartLabels } = monthlyData;

      
      const { productLabels, productData } = await getTopProductsData();
      const { categoryLabels, categoryData } = await getTopCategoriesData();
      const { brandLabels, brandData } = await getTopBrandsData();

      //  dashboard with full data
      res.render("dashboard", {
        totalDiscount,
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        totalUsersGrowth,
        totalProductsGrowth,
        totalOrdersGrowth,
        totalRevenueGrowth,
        recentOrders: formattedRecentOrders,
        chartData: {
          revenueData,
          ordersData,
          chartLabels,
          productLabels,
          productData,
          categoryLabels,
          categoryData,
          brandLabels,
          brandData
        },
      });
    } catch (error) {
      console.error("Dashboard Error:", error);
      res.render("error", { message: "Error loading dashboard", error });
    }
  } else {
    res.redirect("/admin/login");
  }
};

const downloadReport = async (req, res) => {
  try {
    const { reportType, reportFormat, startDate, endDate } = req.query;
    const { startDate: start, endDate: end } = getDateRange(reportType, startDate, endDate);

    // Get orders data
    const orders = await Order.find({
      orderDate: { $gte: start, $lte: end },
    })
      .populate("userId", "name")
      .sort({ orderDate: -1 });

    // Process data for report
    const reportData = orders.map((order) => ({
      orderId: order.orderId,
      date: order.orderDate.toLocaleDateString(),
      customerName: order.userId?.name || "Unknown",
      status: order.orderedItems[0]?.status || "Processing",
      revenue: order.finalAmount || 0,
      orders: 1,
      productsSold: order.orderedItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    }));

    
    const groupedData = reportData.reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          orderId: curr.orderId,
          customerName: curr.customerName,
          status: curr.status,
          orders: 0,
          revenue: 0,
          productsSold: 0,
        };
      }
      acc[date].orders += curr.orders;
      acc[date].revenue += curr.revenue;
      acc[date].productsSold += curr.productsSold;
      return acc;
    }, {});

    const finalReportData = Object.values(groupedData);

    // Generate report based on format
    if (reportFormat === "excel") {
      const workbook = await generateExcelReport(reportData, reportType);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales_report_${reportType}.xlsx`
      );
      await workbook.xlsx.write(res);
      res.end();
    } else if (reportFormat === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales_report_${reportType}.pdf`
      );
      const doc = generatePDFReport(finalReportData, reportType);
      doc.pipe(res);
      doc.end();
    }
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
const generateExcelReport = async (data, reportType) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report");

  worksheet.addRow(["Order ID", "Date", "Customer", "Status", "Amount"]);
  data.forEach((row) => {
    worksheet.addRow([row.orderId, row.date, row.customerName, row.status, row.revenue]);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach((column) => {
    column.width = 20;
  });

  return workbook;
};

const generatePDFReport = (data, reportType) => {
  const doc = new PDFDocument();

  doc.fontSize(20).text("Sales Report", { align: "center" });
  doc.fontSize(12).moveDown();
  doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, {
    align: "center",
  });
  doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, { align: "center" });

  const periodStart = data[0]?.date || "";
  const periodEnd = data[data.length - 1]?.date || "";
  doc.text(`Period: ${periodStart} to ${periodEnd}`, { align: "center" });

  doc.moveDown();
  doc.text("Summary:", { align: "center" });
  const totalOrders = data.reduce((sum, row) => sum + row.orders, 0);
  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
  doc.text(`Total Orders: ${totalOrders}`, { align: "center" });
  doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString("en-IN")}`, {
    align: "center",
  });

  const tableTop = 250;
  doc.fontSize(12).text("Order ID", 50, tableTop);
  doc.text("Date", 200, tableTop);
  doc.text("Customer", 300, tableTop);
  doc.text("Status", 400, tableTop);
  doc.text("Amount", 500, tableTop);

  doc.lineWidth(1)
    .moveTo(50, tableTop + 20)
    .lineTo(600, tableTop + 20)
    .stroke();

  let yPosition = tableTop + 40;
  data.forEach((row) => {
    doc.fontSize(10);
    doc.text(row.orderId || "", 50, yPosition, { width: 150 });
    doc.text(row.date || "", 200, yPosition, { width: 100 });
    doc.text(row.customerName || "Unknown", 300, yPosition, { width: 100 });
    doc.text(row.status || "", 400, yPosition, { width: 100 });
    doc.text(`₹${row.revenue.toLocaleString("en-IN")}`, 500, yPosition, { width: 100 });

    yPosition += 30;
    doc.lineWidth(0.5)
      .moveTo(50, yPosition - 5)
      .lineTo(600, yPosition - 5)
      .stroke();
  });

  return doc;
};


const getDateRange = (reportType, startDate, endDate) => {
  const endDateTime = new Date();
  let startDateTime = new Date();

  switch (reportType) {
    case "daily":
      startDateTime.setDate(startDateTime.getDate() - 1);
      break;
    case "weekly":
      startDateTime.setDate(startDateTime.getDate() - 7);
      break;
    case "yearly":
      startDateTime.setFullYear(startDateTime.getFullYear() - 1);
      break;
    case "custom":
      if (startDate && endDate) {
        startDateTime = new Date(startDate);
        endDateTime.setTime(new Date(endDate).getTime() + 86399999); // End of day
      }
      break;
  }
  return { startDate: startDateTime, endDate: endDateTime };
};

const getMonthlyData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthlyData = await Order.aggregate([
    { $match: { orderDate: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          month: { $month: "$orderDate" },
          year: { $year: "$orderDate" },
        },
        revenue: { $sum: "$finalAmount" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const last6Months = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    last6Months.unshift({ month: d.getMonth() + 1, year: d.getFullYear() });
  }

  const revenueData = new Array(6).fill(0);
  const ordersData = new Array(6).fill(0);

  monthlyData.forEach((data) => {
    const month = data._id.month;
    const year = data._id.year;
    const index = last6Months.findIndex((m) => m.month === month && m.year === year);
    if (index !== -1) {
      revenueData[index] = data.revenue;
      ordersData[index] = data.orderCount;
    }
  });

  const chartLabels = last6Months.map((m) => monthNames[m.month - 1]);
  return { revenueData, ordersData, chartLabels };
};

const getTopProductsData = async () => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$orderedItems.product",
          totalQuantity: { $sum: "$orderedItems.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $match: { "productInfo.0": { $exists: true } } },
    ]);

    if (topProducts.length > 0) {
      return {
        productLabels: topProducts.map((p) => p.productInfo[0]?.productName || "Unknown Product"),
        productData: topProducts.map((p) => p.totalQuantity),
      };
    }
    return {
      productLabels: ["No Products"],
      productData: [100],
    };
  } catch (err) {
    console.error("Error fetching top products:", err);
    return {
      productLabels: ["Error"],
      productData: [100],
    };
  }
};

const getTopCategoriesData = async () => {
  try {
    const topCategories = await Order.aggregate([
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $lookup: {
          from: "categories",
          localField: "productInfo.category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: "$categoryInfo" },
      {
        $group: {
          _id: "$categoryInfo._id",
          categoryName: { $first: "$categoryInfo.name" },
          count: { $sum: "$orderedItems.quantity" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    return {
      categoryLabels: topCategories.map(c => c.categoryName || "Unknown"),
      categoryData: topCategories.map(c => c.count)
    };
  } catch (err) {
    console.error("Error fetching top categories:", err);
    return {
      categoryLabels: ["No Data"],
      categoryData: [100]
    };
  }
};

const getTopBrandsData = async () => {
  try {
    const topBrands = await Order.aggregate([
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.brand",
          count: { $sum: "$orderedItems.quantity" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 4 }
    ]);

    return {
      brandLabels: topBrands.map(b => b._id || "Unknown"),
      brandData: topBrands.map(b => b.count)
    };
  } catch (err) {
    console.error("Error fetching top brands:", err);
    return {
      brandLabels: ["No Data"],
      brandData: [100]
    };
  }
};

const getCategoryData = async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate = new Date();
    const endDate = new Date();
    
    // Set date range based on requested time range
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    // Get filtered categories data
    const topCategories = await Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $lookup: {
          from: "categories",
          localField: "productInfo.category",
          foreignField: "_id",
          as: "categoryInfo"
        }
      },
      { $unwind: "$categoryInfo" },
      {
        $group: {
          _id: "$categoryInfo._id",
          categoryName: { $first: "$categoryInfo.name" },
          count: { $sum: "$orderedItems.quantity" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    const labels = topCategories.map(c => c.categoryName || "Unknown");
    const data = topCategories.map(c => c.count);
    
    res.json({ labels, data });
  } catch (error) {
    console.error('Error fetching category data:', error);
    res.status(500).json({ error: 'Failed to fetch category data' });
  }
};

const getBrandData = async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate = new Date();
    const endDate = new Date();
    
    // Set date range based on requested time range
    switch (timeRange) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    // Get filtered brands data
    const topBrands = await Order.aggregate([
      { $match: { orderDate: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$orderedItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.brand",
          count: { $sum: "$orderedItems.quantity" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 4 }
    ]);
    
    const labels = topBrands.map(b => b._id || "Unknown");
    const data = topBrands.map(b => b.count);
    
    res.json({ labels, data });
  } catch (error) {
    console.error('Error fetching brand data:', error);
    res.status(500).json({ error: 'Failed to fetch brand data' });
  }
};



module.exports = {
  loadDashboard,
  downloadReport,
  generateExcelReport, 
  generatePDFReport,   
  getCategoryData,
  getBrandData,
  getTopCategoriesData,
  getTopBrandsData,
  getTopProductsData,  
  getMonthlyData,      
  getDateRange         
};