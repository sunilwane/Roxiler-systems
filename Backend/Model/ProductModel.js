const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  id: {
    type: Number,
  },
  title: {
    type: String,
  },
  price: {
    type: Number,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
  },
  image: {
    type: String,
  },
  rating: {
    rate: {
      type: Number,
    },
    count: {
      type: Number,
    },
  },
  dateOfSale: {
    type: Date,
  },
  sold: {
    type: Boolean,
  },
});

const products = mongoose.model("Product", productSchema);

module.exports = { products };
