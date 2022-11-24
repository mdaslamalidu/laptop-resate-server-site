const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

app.get((req, res) => {
  res.send("laptop server is running");
});

const uri = `mongodb+srv://${process.env.UB_USER}:${process.env.DB_PASSWORD}@cluster0.wwiuorc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () => console.log(`laptop server is running on port ${port}`));
