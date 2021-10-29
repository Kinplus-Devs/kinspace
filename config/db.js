const mongoose = require('mongoose')

const connectDB = async () => {
  console.log(process.env.MONGO_URI);
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  console.log(`mongonDB connected: ${conn.connection.host}`.brightBlue.underline.bold)
}

module.exports = connectDB
