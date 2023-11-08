const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();

const port = process.env.PORT || 5000;
//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.khqul4z.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//middlewares
const logger = async (req, res, next) => {
  console.log("called:", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const jobsCollection = client.db("marketPlace").collection("jobs");
    const jobCollection = client.db("marketPlace").collection("myJobs");

    //token
    app.post("/jwt",verifyToken,logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logged out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //jobCollection&jobsCollection
    app.get("/myJobs",async (req, res) => {
      console.log(req.query.email);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/myJobs", async (req, res) => {
      const myJobs = req.body;
      console.log(myJobs);
      const result = await jobCollection.insertOne(myJobs);
      res.send(result);
    });
    //jobs
    app.get("/jobs", async (req, res) => {
      const cursor = jobsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/jobs",logger, verifyToken, async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.put("/postUpdated/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const JobUpdate = req.body;
      const update = {
        $set: {
          title: JobUpdate.title,
          deadline: JobUpdate.deadline,
          minimumPrice: JobUpdate.minimumPrice,
          maximumPrice: JobUpdate.maximumPrice,
          description: JobUpdate.description,
          category: JobUpdate.category,
        },
      };
      const result = await jobsCollection.updateOne(filter, update, option);
      res.send(result);
    });
   
    app.patch("/status/:id", async (req, res) => {
      const id = req.params.id;
      const updatedStatus = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedService = {
        $set: {
          status: updatedStatus.status,
        },
      };
      const result = await jobCollection.updateOne(query, updatedService);
      res.send(result);
    });




    app.post("/jobs", async (req, res) => {
      const newJobs = req.body;
      console.log(newJobs);
      const result = await jobsCollection.insertOne(newJobs);
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
  res.send("Crud is running...");
});

app.listen(port, () => {
  console.log(`Simple Crud is Running on port ${port}`);
});
