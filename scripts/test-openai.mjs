import OpenAI from "openai";
import dotenv from "dotenv";

// Load env variables fresh
dotenv.config({ path: ".env.local" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

console.log("API Key loaded (first 20 chars):", process.env.OPENAI_API_KEY?.slice(0, 20) + "...");

async function test() {
  try {
    console.log("Testing OpenAI API...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise nutrition parser.",
        },
        {
          role: "user",
          content: 'Parse this meal: "I had a banana"',
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    console.log("Success! Response:", completion.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

test();
