const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Middlewire
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dmdmzzd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Databes collection
    const schloarshipCollection = client
      .db("scholarshipManagementDB")
      .collection("scholarships");
    const userCollection = client
      .db("scholarshipManagementDB")
      .collection("users");
    const paymentCollection = client
      .db("scholarshipManagementDB")
      .collection("payments");
    const reviewsCollection = client
      .db("scholarshipManagementDB")
      .collection("reviews");
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // JWT related API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // User related API
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      user.role = user.role || "Member";
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      const ammount = parseInt(price * 100);

      console.log("inside the intent", ammount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: ammount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // stripe.customers
    //   .create({
    //     email: "customer@example.com",
    //   })
    //   .then((customer) => console.log(customer))
    //   .catch((error) => console.error(error));

    // Endpoint to update user role
    app.patch("/users/role/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body; // Get the new role from the request body
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Adding Scholarship in dB
    app.post("/scholarships", async (req, res) => {
      const addScholarship = req.body;
      const result = await schloarshipCollection.insertOne(addScholarship);
      res.send(result);
    });

    app.get("/scholarships", async (req, res) => {
      const cursor = schloarshipCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await schloarshipCollection.deleteOne(query);
      res.send(result);
    });

    // getting details by id
    app.get("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const scholarship = await schloarshipCollection.findOne(query);

      if (scholarship) {
        res.json(scholarship);
      } else {
        res.status(404).json({ message: "Scholarship not found" });
      }
    });
    // Updete scholarship infprmation
    app.patch("/scholarships/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateData,
      };
      const result = await schloarshipCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Payment API
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });

    app.get("/payments", async (req, res) => {
      const cursor = paymentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Endpoint to update payment information
    app.put("/payments", async (req, res) => {
      try {
        const { scholarshipId, ...updateData } = req.body;
        const updatedPayment = await paymentCollection.findOneAndUpdate(
          { scholarshipId },
          { $set: updateData },
          { returnDocument: "after", upsert: true }
        );

        if (updatedPayment.value) {
          res.status(200).json({ updatedId: updatedPayment.value._id });
        } else {
          res.status(404).json({ error: "Payment not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Endpoint to get payments by email
    app.get("/payments/:email", async (req, res) => {
      const query = { email: req.params.email };
      if (!req.params.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/payments/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body; // Get the new role from the request body
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: status,
        },
      };
      const result = await paymentCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentCollection.deleteOne(query);
      res.send(result);
    });

    // ----------Reciews-------------//
    app.post("/reviews", async (req, res) => {
      try {
        const { university, review, email, rating } = req.body;
        const reviewData = { university, review, email, rating };
        const result = await reviewsCollection.insertOne(reviewData);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send(error.message);
      }
    });

    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });


    app.get("/payments/:email", async (req, res) => {
      const query = { email: req.params.email };
      if (!req.params.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Schloarship Management System");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
