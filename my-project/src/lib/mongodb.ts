import mongoose from "mongoose";

export async function connectDb() {
  await mongoose.connect(
    "mongodb+srv://dsolerolguin:k16MA4ZyqiLeCj7P@stass.vk4ne.mongodb.net/?retryWrites=true&w=majority&appName=STASS"
  );
}
