const express = require("express");
const { connection } = require("./Connection");
const { products } = require("./Model/ProductModel");
const { default: axios } = require("axios");
const cors = require("cors");
const app = express();

app.use(cors());
const THIRD_PARTY_API_URL =
  "https://s3.amazonaws.com/roxiler.com/product_transaction.json";
app.use(express.json());

app.get("/initialize-db", async (req, res) => {
  try {
    const response = await axios.get(THIRD_PARTY_API_URL);
    const products_data = response.data;
    await products.insertMany(products_data);
    res.status(200).json({ message: "Database initialized with seed data" });
  } catch (error) {
    console.error("Error initializing database:", error);
    res.status(500).json({ message: "Failed to initialize database" });
  }
});
// app.get("/transactions", async (req, res) => {
//   const { search = "", page = 1, perPage = 10, month } = req.query;

//   if (!month || isNaN(month)) {
//     return res.status(400).json({ message: "Valid month number is required" });
//   }

//   try {
//     const currentYear = new Date().getFullYear();
//     const monthNumber = parseInt(month) - 1; // 0-indexed month

//     const startDate = new Date(Date.UTC(currentYear, monthNumber, 1, 0, 0, 0));
//     const endDate = new Date(
//       Date.UTC(currentYear, monthNumber + 1, 0, 23, 59, 59, 999)
//     );

//     console.log(
//       `Fetching transactions from ${startDate.toISOString()} to ${endDate.toISOString()}`
//     );

//     const searchRegex = new RegExp(search, "i");
//     const priceSearch = parseFloat(search);
//     const isPriceSearchValid = !isNaN(priceSearch);

//     const query = {
//       dateOfSale: {
//         $gte: startDate,
//         $lt: endDate,
//       },
//     };

//     if (search) {
//       query.$or = [
//         { title: searchRegex },
//         { description: searchRegex },
//         ...(isPriceSearchValid ? [{ price: priceSearch }] : []),
//       ];
//     }

//     console.log("Final query:", JSON.stringify(query, null, 2));

//     const transactions = await products
//       .find(query)
//       .skip((page - 1) * perPage)
//       .limit(parseInt(perPage, 10));

//     console.log(`Transactions found: ${transactions.length}`);

//     const total = await products.countDocuments({
//       dateOfSale: {
//         $gte: startDate,
//         $lt: endDate,
//       },
//     });

//     res.json({
//       transactions,
//       totalPages: Math.ceil(total / perPage),
//       currentPage: parseInt(page, 10),
//     });
//   } catch (error) {
//     console.error("Error fetching transactions:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to fetch transactions", error: error.message });
//   }
// });

app.get("/statistics", async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: "Month is required" });
  }
  const monthNumber = new Date(`${month} 1, 2024`).getMonth();
  try {
    const totalSaleAmount = await products.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: new Date(2024, monthNumber, 1),
            $lt: new Date(2024, monthNumber + 1, 1),
          },
          sold: true,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$price" },
        },
      },
    ]);
    const totalSoldItems = await products.countDocuments({
      dateOfSale: {
        $gte: new Date(2024, monthNumber, 1),
        $lt: new Date(2024, monthNumber + 1, 1),
      },
      sold: true,
    });
    const totalNotSoldItems = await products.countDocuments({
      dateOfSale: {
        $gte: new Date(2024, monthNumber, 1),
        $lt: new Date(2024, monthNumber + 1, 1),
      },
      sold: false,
    });

    res.json({
      totalSaleAmount: totalSaleAmount[0]?.totalAmount || 0,
      totalSoldItems,
      totalNotSoldItems,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

app.get("/transactions", async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10

  try {
    // Fetch the data, using pagination with limit and skip
    const getdata = await products
      .find()
      .limit(limit * 1) // Convert limit to a number and limit the results
      .skip((page - 1) * limit) // Skip documents according to the current page
      .exec(); // Execute the query

    // Get total number of documents
    const count = await products.countDocuments();

    // Send response with data, total pages, and total transactions
    res.json({
      data: getdata,
      totalPages: Math.ceil(count / limit), // Total number of pages
      currentPage: page, // Current page
      totalTransactions: count, // Total transactions for pagination
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to fetch data" });
  }
});

app.get("/bar-chart", async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: "Month is required" });
  }
  const monthNumber = new Date(`${month} 1, 2024`).getMonth();
  try {
    const priceRanges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Number.MAX_SAFE_INTEGER },
    ];

    const barData = await Promise.all(
      priceRanges.map(async (range) => {
        const count = await products.countDocuments({
          price: { $gte: range.min, $lte: range.max },
          dateOfSale: {
            $gte: new Date(2024, monthNumber, 1),
            $lt: new Date(2024, monthNumber + 1, 1),
          },
        });

        return { range: `${range.min}-${range.max}`, count };
      })
    );

    res.json({ barData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch bar chart data" });
  }
});

app.get("/pie-chart", async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: "Month is required" });
  }
  const monthNumber = new Date(`${month} 1, 2024`).getMonth();
  try {
    const pieData = await products.aggregate([
      {
        $match: {
          dateOfSale: {
            $gte: new Date(2024, monthNumber, 1),
            $lt: new Date(2024, monthNumber + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(
      pieData.map((item) => ({ category: item._id, count: item.count }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch pie chart data" });
  }
});

app.get("/combined-data", async (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ message: "Month is required" });
  }
  try {
    const barChartData = await axios.get(
      `http://localhost:8083/bar-chart?month=${month}`
    );
    const pieChartData = await axios.get(
      `http://localhost:8083/pie-chart?month=${month}`
    );
    const statisticsData = await axios.get(
      `http://localhost:8083/statistics?month=${month}`
    );
    res.json({
      barChart: barChartData.data,
      pieChart: pieChartData.data,
      statistics: statisticsData.data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch combined data" });
  }
});

app.listen(8083, async () => {
  await connection;
  console.log("db is connected...");
  console.log("server is running...");
});
