import express from 'express'
import bodyParser from 'body-parser'
import process from 'process';
import cors from 'cors';



const app = express()
const port = process.env.PORT || 8080

const corsOptions = {
    origin: process.env.ORIGIN_URL || 'http://localhost:8100',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'refresh_token'],
    exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'],
    credentials: true
}

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

app.use((req, res, next) => {
    console.log('Passing through express. REQ:', req.method, req.url);
    next();
});


app.get('/', (req: any, res: any) => {
    res.send("API Working")
})

app.listen(port, () => {
    return console.log(`Server is listening on ${port}`)
})   