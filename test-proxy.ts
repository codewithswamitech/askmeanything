import ZAI from "z-ai-web-dev-sdk";
async function main() {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: "Hello" }],
      thinking: { type: "disabled" }
    });
    console.log("Success:", completion.choices[0]?.message?.content);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
