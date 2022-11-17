const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;


const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6ua546u.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

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



app.get('/', (req, res) => {
    res.send('doctors portal server is running fine')
})






app.listen(port, () => {
    console.log(`dcotors portal server is running on ${port}`)
})