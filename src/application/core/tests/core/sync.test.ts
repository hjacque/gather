import { BSON, Collection, Db, MongoClient } from "mongodb";
import { CardRepositoryPort } from "../../../../repository/ports/card.repository.port";
import { SyncUsecase } from "../../sync.usecase";
import { CardModel } from "../../../../repository/mongo/models/card.model.mongo";
import { CardRepositoryMongo } from "../../../../repository/mongo/card.repository.mongo";
import { MONGODB_COLLECTION_CARDS } from "../../../../constants";

describe("AddTeamMemberUsecase", () => {
  let connection: MongoClient;
  let db: Db;
  let cardCollection: Collection<CardModel>;
  let cardRepo: CardRepositoryPort;

  let syncUsecase: SyncUsecase;

  beforeAll(async () => {
    connection = await MongoClient.connect((global as any).__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any);
    db = connection.db();

    cardCollection = db.collection<CardModel>(MONGODB_COLLECTION_CARDS);
    cardRepo = new CardRepositoryMongo(cardCollection);

    syncUsecase = new SyncUsecase(cardRepo);
  });

  afterAll(async () => {
    await connection.close();
  });

  // test("todo", async () => {});
});
