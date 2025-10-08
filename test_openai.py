from openai import OpenAI

client = OpenAI(
  api_key="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"
)

response = client.responses.create(
  model="gpt-5-nano",
  input="write a haiku about ai",
  store=True,
)

print(response.output_text);
