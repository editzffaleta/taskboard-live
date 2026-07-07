import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { Label } from "../../../src/label/model";
import { AssignLabel } from "../../../src/label/usecase/assign-label.usecase";
import {
  FakeCardLabelRepository,
  FakeCardRepository,
  FakeLabelRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const cardLabelRepository = new FakeCardLabelRepository();
  const labelRepository = new FakeLabelRepository();
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new AssignLabel(
    cardLabelRepository,
    labelRepository,
    cardRepository,
    listRepository,
    membershipRepository,
  );

  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const card = await cardRepository.create(
    new Card({ listId: list.id, title: "Cartao", position: 0 }),
  );
  const label = await labelRepository.create(
    new Label({ boardId: BOARD_ID, name: "Backend", color: "blue" }),
  );

  return {
    cardLabelRepository,
    labelRepository,
    cardRepository,
    listRepository,
    membershipRepository,
    useCase,
    list,
    card,
    label,
  };
}

describe("AssignLabel", () => {
  it("atribui a etiqueta ao cartao e retorna o cartao com labels", async () => {
    const { useCase, card, label } = await setup();

    const { card: returnedCard, labels } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      labelId: label.id,
      requesterId: MEMBER_ID,
    });

    expect(returnedCard.id).toBe(card.id);
    expect(labels.map((item) => item.id)).toEqual([label.id]);
  });

  it("e idempotente ao atribuir uma etiqueta ja atribuida", async () => {
    const { useCase, cardLabelRepository, card, label } = await setup();

    await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      labelId: label.id,
      requesterId: MEMBER_ID,
    });
    const { labels } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      labelId: label.id,
      requesterId: MEMBER_ID,
    });

    expect(cardLabelRepository.links).toHaveLength(1);
    expect(labels).toHaveLength(1);
  });

  it("rejeita quando o cartao pertence a outro quadro", async () => {
    const { useCase, listRepository, cardRepository, label } = await setup();
    const otherList = await listRepository.create(
      new List({ boardId: OTHER_BOARD_ID, title: "Outro", position: 0 }),
    );
    const otherCard = await cardRepository.create(
      new Card({ listId: otherList.id, title: "Outro cartao", position: 0 }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: otherCard.id,
        labelId: label.id,
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita quando a etiqueta pertence a outro quadro", async () => {
    const { useCase, labelRepository, card } = await setup();
    const otherLabel = await labelRepository.create(
      new Label({ boardId: OTHER_BOARD_ID, name: "Outra", color: "red" }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        labelId: otherLabel.id,
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { useCase, card, label } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        labelId: label.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
