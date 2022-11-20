const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ua546u.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(403).send({ message: "unauthorized access" })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: "unauthorized access" })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        await client.connect()
        console.log('mongodb connected successfully')
    } catch (error) {
        console.log(error)
    }
}
run();

const AppointmentOptionsCollection = client.db("doctorsPortal").collection("appointmentOptions");
const BookingsCollection = client.db('doctorsPortal').collection('bookings');
const UsersCollection = client.db('doctorsPortal').collection('users');
const DoctorsCollection = client.db('doctorsPortal').collection('doctors');

app.post('/users', async (req, res) => {
    try {
        const newUser = req.body;
        const result = await UsersCollection.insertOne(newUser);
        res.send(result)
    } catch (error) {
        console.log(error)
    }
})

app.get('/users', async (req, res) => {
    try {
        const query = {}
        const result = await UsersCollection.find(query).toArray();
        res.send(result)
    } catch (error) {
        console.log(error)
    }
})

app.get("/users/admin/:email", async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const user = await UsersCollection.findOne(query);
    res.send({ isAdmin: user?.role === 'admin' })
})

app.put('/users/admin/:id', verifyJWT, async (req, res) => {
    try {

        const decoded = req.decoded;
        const filter = { email: decoded }
        const user = UsersCollection.find(filter);
        if (user?.role !== "admin") {
            return res.status(401).send({ message: "forbidden" })
        }

        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: {
                role: "admin"
            }
        }

        const result = await UsersCollection.updateOne(query, updateDoc, options);

    } catch (error) {
        console.log(error)
    }
})

app.get('/jwt', async (req, res) => {
    // ACCESS_TOKEN_SECRET
    const email = req.query.email;
    const query = { email: email }
    const exist = await UsersCollection.find(query).toArray();
    if (exist) {
        const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET);
        res.send({ token })
    }
})

app.get('/appointmentOptions', async (req, res) => {
    try {
        const query = {}
        const options = await AppointmentOptionsCollection.find(query).toArray();

        const date = req.query.date;
        const bookingQuery = { date: date }
        const alreadyBooked = await BookingsCollection.find(bookingQuery).toArray();

        options.forEach(option => {
            const optionBooked = alreadyBooked.filter(book => book.treatmentName === option.name);
            const bookedSlots = optionBooked.map(book => book.slot)
            const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
            option.slots = remainingSlots;
            // console.log(date, option.name , bookedSlots)
            // console.log(optionBooked)
        })

        res.send(options)
    } catch (error) {
        console.log(error)
    }
})

app.get('/appointmentSpecialty', async (req, res) => {
    try {
        const query = {};
        const project = { name: 1 };
        const data = AppointmentOptionsCollection.find(query);
        const result = await data.project(project).toArray();
        res.send(result)
    } catch (error) {
        console.log(error)
    }
})

app.post('/bookings', async (req, res) => {
    try {
        const newBooking = req.body
        const query = {
            date: newBooking.date,
            email: newBooking.email,
            treatmentName: newBooking.treatmentName
        }

        const alreadyBooked = await BookingsCollection.find(query).toArray();
        if (alreadyBooked.length) {
            const message = `You already have an appoinment on ${newBooking.date}`
            return res.send({ acknowledged: false, message });
        }

        const result = await BookingsCollection.insertOne(newBooking);
        res.send(result);
    } catch (error) {
        console.log(error)
    }
})

app.get('/bookings', verifyJWT, async (req, res) => {
    try {
        const email = req.query.email;

        if (req.decoded !== email) {
            return res.status(401).send({ message: "forbidden access" });
        }

        const query = { email: email }
        const cursor = BookingsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    } catch (error) {
        console.log(error)
    }
})

app.post('/doctors', async (req, res) => {
    try {
        const newDoctor = req.body;
        const result = await DoctorsCollection.insertOne(newDoctor);
        res.send(result);
    } catch (error) {
        console.log(error)
    }
})

app.get('/doctors', async (req, res) => {
    try {
        const query = {}
        const data = DoctorsCollection.find(query);
        const result = await data.toArray();
        res.send(result);
    } catch (error) {
        console.log(error)
    }
})


app.get('/', (req, res) => {
    res.send('doctors portal server is running fine')
})






app.listen(port, () => {
    console.log(`dcotors portal server is running on ${port}`)
})