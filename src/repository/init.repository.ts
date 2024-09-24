import { MongoClient } from "mongodb";
import { MONGODB_COLLECTION_CARDS, MONGODB_DATABASE_NAME } from "../constants";
import { CardModel } from "./mongo/models/card.model.mongo";
import { CardRepositoryPort } from "./ports/card.repository.port";
import { CardRepositoryMongo } from "./mongo/card.repository.mongo";

export const initRepository = async (): Promise<{
  repositories: {
    cardRepository: CardRepositoryPort;
  };
  close: () => Promise<void>;
}> => {
  // mongo
  const url = "mongodb://localhost:27017"; // todo var in .env or sops
  const mongoClient = new MongoClient(url);
  const mongoClientConnected = await mongoClient.connect();
  const mongoDBClient = mongoClientConnected.db(MONGODB_DATABASE_NAME);
  console.log("Connected successfully to server");

  // mongo collections
  const cardCollection = mongoDBClient.collection<CardModel>(
    MONGODB_COLLECTION_CARDS
  );

  // repositories
  const cardRepository = new CardRepositoryMongo(cardCollection);

  return {
    repositories: {
      cardRepository,
    },
    close: async () => {
      await mongoClient.close();
    },
  };
};
