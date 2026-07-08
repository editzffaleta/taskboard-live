import { Attachment } from "../../../src/attachment/model";

const CARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const USER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

describe("Attachment", () => {
  it("cria um anexo valido", () => {
    const attachment = new Attachment({
      cardId: CARD_ID,
      filename: "foto.png",
      mimeType: "image/png",
      size: 1024,
      storageKey: "abc123.png",
      uploadedById: USER_ID,
    });

    expect(() => attachment.validate()).not.toThrow();
    expect(attachment.filename).toBe("foto.png");
  });

  it("rejeita filename vazio", () => {
    const attachment = new Attachment({
      cardId: CARD_ID,
      filename: "",
      mimeType: "image/png",
      size: 1024,
      storageKey: "abc123.png",
      uploadedById: USER_ID,
    });

    expect(() => attachment.validate()).toThrow();
  });

  it("rejeita size <= 0", () => {
    const attachment = new Attachment({
      cardId: CARD_ID,
      filename: "foto.png",
      mimeType: "image/png",
      size: 0,
      storageKey: "abc123.png",
      uploadedById: USER_ID,
    });

    expect(() => attachment.validate()).toThrow();
  });

  it("rejeita mimeType vazio", () => {
    const attachment = new Attachment({
      cardId: CARD_ID,
      filename: "foto.png",
      mimeType: "",
      size: 1024,
      storageKey: "abc123.png",
      uploadedById: USER_ID,
    });

    expect(() => attachment.validate()).toThrow();
  });
});
