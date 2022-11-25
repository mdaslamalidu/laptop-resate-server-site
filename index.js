const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

app.get((req, res) => {
  res.send("laptop server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wwiuorc.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function veryJwt(req, res, next) {
  const authHeader = req.headers.authorizations;
  if (!authHeader) {
    return res.status(401).send("unauthorization access");
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoriesCollections = client
      .db("laptop-sotries")
      .collection("categories");
    const productsCollections = client
      .db("laptop-sotries")
      .collection("products");
    const usersCollection = client.db("laptop-sotries").collection("users");
    const bookingCollection = client
      .db("laptop-sotries")
      .collection("bookings");

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const updateOne = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        updateOne
      );
      console.log(result);

      // const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
      //   expiresIn: "1d",
      // });

      // res.send({ result, token });
    });

    app.post("/users", async (req, res) => {
      const query = req.body;
      const result = await usersCollection.insertOne(query);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      let query = {};
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollections.find(query).toArray();
      res.send(result);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { categoryId: id };
      const result = await productsCollections.find(query).toArray();
      res.send(result);
    });

    // insert all bookings
    app.post("/bookings", async (req, res) => {
      const query = req.body;
      const id = query.category_id;
      const myProduct = { _id: ObjectId(id) };
      const update = { upsert: true };
      const updateDoc = {
        $set: {
          status: "sold",
        },
      };
      const data = await productsCollections.updateOne(
        myProduct,
        updateDoc,
        update
      );
      console.log(data);

      const result = await bookingCollection.insertOne(query);
      res.send(result);
    });

    //add product
    app.post("/product", async (req, res) => {
      const query = req.body;
      const result = await productsCollections.insertOne(query);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      return res.status(403).send({ accesToken: "" });
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () => console.log(`laptop server is running on port ${port}`));
