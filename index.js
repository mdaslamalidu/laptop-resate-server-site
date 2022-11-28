const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("laptop server is running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wwiuorc.mongodb.net/?retryWrites=true&w=majority`;
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
    const advertiseCollection = client
      .db("laptop-sotries")
      .collection("advertise");
    const reportedCollection = client
      .db("laptop-sotries")
      .collection("reportedItems");
    const paymentCollection = client
      .db("laptop-sotries")
      .collection("payments");

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

      const updatedVarified = {
        $set: { verifiedStatus: "verified" },
      };

      const verifySeller = await productsCollections.updateOne(
        filter,
        updatedVarified,
        updateOne
      );

      console.log(result, verifySeller);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const bookings = req.body;
      const price = bookings.categoryPrice;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", async (req, res) => {
      const query = req.body;
      const id = query.bookingId;
      const productId = { _id: ObjectId(query.productId) };
      const filter = { _id: ObjectId(id) };
      const updated = { upsert: true };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: query.transactionId,
        },
      };
      const updateProduct = await productsCollections.updateOne(
        productId,
        updateDoc,
        updated
      );
      const result = await paymentCollection.insertOne(query);
      const updateData = await bookingCollection.updateOne(
        filter,
        updateDoc,
        updated
      );
      console.log(updateData, updateProduct);
      res.send(result);
    });

    app.post("/report", async (req, res) => {
      const query = req.body;
      const result = await reportedCollection.insertOne(query);
      console.log(result);
      res.send(result);
    });

    app.get("/report", async (req, res) => {
      const query = {};
      const result = await reportedCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/orders", veryJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const filter = { email: email };
      const result = await bookingCollection.find(filter).toArray();
      res.send(result);
    });

    app.delete("/report/:id", async (req, res) => {
      const id = req.params.id;
      const query = { reportId: id };
      const filter = { _id: ObjectId(id) };
      const result = await reportedCollection.deleteOne(query);
      const data = await productsCollections.deleteOne(filter);
      console.log(result, data);
      res.send(result);
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

    app.delete("/users/:id", async (req, res) => {
      const query = req.params.id;
      const filter = { _id: ObjectId(query) };
      const result = await usersCollection.deleteOne(filter);
      console.log(result);
      res.send(result);
    });

    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      console.log(user === null);
      res.send({ role: user === "null" ? "false" : user });
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
    app.post("/bookings", veryJwt, async (req, res) => {
      const query = req.body;
      const email = query.email;
      const id = query.category_id;
      const bookingId = { category_id: query.category_id };
      const productId = { _id: ObjectId(id) };
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        const message = "please login and verify your account";
        return res.send({
          acknowledged: false,
          message,
        });
      }

      const alreadyBooked = await bookingCollection.find(bookingId).toArray();

      if (alreadyBooked.length) {
        const message = "you have already booked  this product";
        return res.send({
          acknowledged: false,
          message,
        });
      }

      const advertisedId = { advertiseId: id };
      console.log(advertisedId, id);
      const deleteItem = await advertiseCollection.deleteOne(advertisedId);
      console.log(deleteItem);
      const update = { upsert: true };
      const updateDoc = {
        $set: {
          status: "sold",
        },
      };
      const data = await productsCollections.updateOne(
        productId,
        updateDoc,
        update
      );
      console.log(data);

      const result = await bookingCollection.insertOne(query);
      res.send(result);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingCollection.findOne(query);
      res.send(result);
    });

    //add product
    app.post("/product", async (req, res) => {
      const query = req.body;
      const result = await productsCollections.insertOne(query);
      res.send(result);
    });

    app.get("/products", veryJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: decodedEmail };
      const result = await productsCollections.find(query).toArray();
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

    app.post("/advertise", async (req, res) => {
      const query = req.body;
      const result = await advertiseCollection.insertOne(query);
      res.send(result);
    });

    app.get("/advertise", veryJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      console.log(email, decodedEmail);
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {};
      const result = await advertiseCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.listen(port, () => console.log(`laptop server is running on port ${port}`));
