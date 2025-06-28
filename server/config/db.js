import mongoose from 'mongoose'

const connectDb = async () => {
  try {
    mongoose.connection.on('connected',() => console.log("DataBase is Connected"));
    await mongoose.connect(`${process.env.DB_URI}`);
  } catch (error) {
    console.error(error);
  }

}
export default connectDb
