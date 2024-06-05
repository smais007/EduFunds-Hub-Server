const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // User related API
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
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

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Schloarship Management System");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
