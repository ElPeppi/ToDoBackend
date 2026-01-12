import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const table = process.env.WS_CONNECTIONS_TABLE;

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    body = {};
  }

  // Solo manejamos ping por ahora
  if (body?.type !== "ping") {
    return { statusCode: 200, body: "OK" };
  }

  // TTL renovable (2 min)
  const ttl = Math.floor(Date.now() / 1000) + 120;

  try {
    // Buscar userId desde item invertido
    const metaRes = await ddb.send(
      new GetCommand({
        TableName: table,
        Key: { pk: `conn:${connectionId}`, sk: "meta" },
      })
    );

    const userId = metaRes?.Item?.userId;

    // Renovar TTL en conn meta
    await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: `conn:${connectionId}`, sk: "meta" },
        UpdateExpression: "SET ttl = :ttl",
        ExpressionAttributeValues: { ":ttl": ttl },
      })
    );

    // Renovar TTL en user->conn si tenemos userId
    if (userId) {
      await ddb.send(
        new UpdateCommand({
          TableName: table,
          Key: { pk: `user:${userId}`, sk: `conn:${connectionId}` },
          UpdateExpression: "SET ttl = :ttl",
          ExpressionAttributeValues: { ":ttl": ttl },
        })
      );
    }
  } catch (err) {
    console.error("ping update error:", err);
  }

  return { statusCode: 200, body: "pong" };
};
