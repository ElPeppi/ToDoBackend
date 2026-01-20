import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type WsEvent = {
  requestContext: { connectionId: string };
  body?: string | null;
};

type PingBody = {
  type?: string;
  [k: string]: unknown;
};

export const handler = async (event: WsEvent) => {
  const connectionId = event.requestContext.connectionId;

  const table = process.env.WS_CONNECTIONS_TABLE;
  if (!table) return { statusCode: 500, body: "Missing WS_CONNECTIONS_TABLE" };

  let body: PingBody = {};
  try {
    body = event.body ? (JSON.parse(event.body) as PingBody) : {};
  } catch {
    body = {};
  }

  // Solo manejamos ping
  if (body.type !== "ping") {
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

    const userId = (metaRes.Item as any)?.userId as string | undefined;

    // Renovar TTL en conn meta
    await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk: `conn:${connectionId}`, sk: "meta" },
        UpdateExpression: "SET ttl = :ttl",
        ExpressionAttributeValues: { ":ttl": ttl },
      })
    );

    // Renovar TTL en user->conn
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
