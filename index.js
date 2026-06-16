const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const port = 5000;

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://study-nook-client-black.vercel.app"
  ],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let roomsCollection;
let bookingsCollection;


async function run() {
  try {
    await client.connect();

    const db = client.db(process.env.AUTH_DB_NAME || "studyNook");

    roomsCollection = db.collection("rooms");
    bookingsCollection = db.collection("bookings");

    console.log("MongoDB Connected Successfully");

  } catch (err) {
    console.log("DB Error:", err);
  }
}

run().catch(console.dir);


app.post("/jwt", (req, res) => {

  const token = jwt.sign(
    { email: req.body.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  res.send({ success: true });
});


const verifyToken = (req, res, next) => {

  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send({
      message: "Unauthorized Access",
    });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET,
    (err, decoded) => {

      if (err) {
        return res.status(401).send({
          message: "Invalid Token",
        });
      }

      req.user = decoded;

      next();
    }
  );
};


app.post("/logout", (req, res) => {

  res.clearCookie("token");

  res.send({
    success: true,
  });
});


app.get("/", (req, res) => {
  res.send("StudyNook API Running fine");
});



app.post("/api/rooms", verifyToken, async (req, res) => {
  const room = req.body;

  room.createdAt = new Date();
  room.bookingCount = 0;

  const result = await roomsCollection.insertOne(room);

  res.send(result);
});


app.get("/api/rooms", async (req, res) => {
  const { search } = req.query;

  let query = {};

  if (search) {
    query.title = {
      $regex: search,
      $options: "i",
    };
  }

  const result = await roomsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
});


app.get("/api/rooms/:id", async (req, res) => {
  const id = req.params.id;

  const result = await roomsCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});

app.patch("/api/rooms/:id", async (req, res) => {
  const id = req.params.id;

  const updatedData = req.body;

  const result = await roomsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: updatedData,
    }
  );

  res.send(result);
});

app.delete("/api/rooms/:id", async (req, res) => {
  const id = req.params.id;

  const result = await roomsCollection.deleteOne({
    _id: new ObjectId(id),
  });

  res.send(result);
});



app.get("/api/my-listings/:email", verifyToken, async (req, res) => {
  const email = req.params.email;

  const result = await roomsCollection
    .find({ ownerEmail: email })
    .toArray();

  res.send(result);
});



app.post("/api/bookings", verifyToken, async (req, res) => {

  const booking = req.body;

  const conflict = await bookingsCollection.findOne({
    roomId: booking.roomId,
    date: booking.date,
    startTime: booking.startTime,
    status: "confirmed",
  });

  if (conflict) {
    return res.status(400).send({
      message: "This time slot is already booked",
    });
  }

  booking.status = "confirmed";
  booking.createdAt = new Date();

  const result = await bookingsCollection.insertOne(booking);

  await roomsCollection.updateOne(
    { _id: new ObjectId(booking.roomId) },
    { $inc: { bookingCount: 1 } }
  );

  res.send(result);
});


app.get("/api/bookings/:email", verifyToken, async (req, res) => {
  const email = req.params.email;

  const result = await bookingsCollection
    .find({ userEmail: email })
    .sort({ createdAt: -1 })
    .toArray();

  res.send(result);
});


app.patch("/api/bookings/cancel/:id", verifyToken, async (req, res) => {
  const id = req.params.id;

  const booking = await bookingsCollection.findOne({
    _id: new ObjectId(id),
  });

  await bookingsCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "cancelled",
      },
    }
  );

  await roomsCollection.updateOne(
    {
      _id: new ObjectId(booking.roomId),
    },
    {
      $inc: {
        bookingCount: -1,
      },
    }
  );

  res.send({
    success: true,
    message: "Booking cancelled",
  });
});




app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});