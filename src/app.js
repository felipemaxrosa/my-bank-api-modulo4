import express from "express";
import mongoose from "mongoose";
import accountsRouter from "../routes/accountsRouter.js";
require("dotenv").config();

// Banco no Atlas
// const URL = `mongodb+srv://${process.env.USERDB}:${process.env.PASSDB}@api-test-iiinl.mongodb.net/igti-my-bank?retryWrites=true&w=majority`;
const URL = `mongodb+srv://admin:1q2w3e@api-test-iiinl.mongodb.net/igti-my-bank?retryWrites=true&w=majority`;

// Conectando ao Banco
const connectDB = async () => {
  try {
    await mongoose.connect(URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
    console.log("MongoDB connection established!");
    console.log("API is running!");
  } catch (error) {
    console.log("Error connecting to MongoDB");
  }
};

const app = express();
app.use(express.json());
app.use("/account", accountsRouter);

app.listen(3000, connectDB);
