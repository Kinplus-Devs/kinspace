require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const colors = require('colors')
const cors = require('cors')
const http = require('http')
const path = require('path')
const ejsMate = require('ejs-mate')
const { ExpressPeerServer } = require('peer')

// Init app
const app = express()

const server = http.createServer(app)

const peerServer = ExpressPeerServer(server, {
  debug: true
});

const { v4: uuidV4 } = require('uuid')


app.use('/peerjs', peerServer)

// Socket.io
const { Server } = require('socket.io')
const io = new Server(server)

// Local Middlewares
const appError = require('./middlewares/error')
  // const connectDB = require('./config/db')

// Routes
const auth = require('./routes/authRoutes')

// Load env variables
// dotenv.config({ path: './config/config.env' })

// connect db
// connectDB()

// Middlewares
app.use(cors())

app.use(express.static(`${__dirname}/public`))

// Body parser
app.use(express.json({ extended: true }))

// Template Engine
app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Dev Logging middle
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

// Routes
app.use('/api/v1/auth', auth)

app.get('/', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req, res) => {
  res.status(200).render('index', {
    path: '/',
    pageTitle: 'Kinstream',
    roomId: req.params.room
  })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    console.log(userId, roomId)
    socket.join(roomId)
    socket.broadcast.to(roomId).emit('user-connected', userId)

    socket.on('disconnect', () => {
      socket.broadcast.to(roomId).emit('user-disconnected', userId)
    })
  })

})

app.use(appError)

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
  console.log(`server started on port ${PORT}`)
})

// // Handle unhandle promise rejection
// process.on('unhanledRejection', (err, promise) => {
//   console.log(`Error: ${err.message}`.red)

//   // Close server and exit process
//   server.close(() => process.exit(1))
// })