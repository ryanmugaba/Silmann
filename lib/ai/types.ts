export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiToolCallLog = {
  name: string;
  input: unknown;
  result: unknown;
};
