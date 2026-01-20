import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type WsEvent = {
  requestContext: { connectionId: string };
};

export const handler = async (event: WsEvent) => {
  const connectionId = event.requestContext.connectionId;

  const table = process.env.WS_CONNECTIONS_TABLE;
  if (!table) return { statusCode: 500, body: "Missing WS_CONNECTIONS_TABLE" };

  try {
    const metaRes = await ddb.send(
      new GetCommand({
        TableName: table,
        Key: { pk: `conn:${connectionId}`, sk: "meta" },
      })
    );

    const meta = metaRes.Item as any | undefined;
    const userId = meta?.userId as string | undefined;

    // borrar invertido
    await ddb.send(
      new DeleteCommand({
        TableName: table,
        Key: { pk: `conn:${connectionId}`, sk: "meta" },
      })
    );

    // borrar user->conn
    if (userId) {
      await ddb.send(
        new DeleteCommand({
          TableName: table,
          Key: { pk: `user:${userId}`, sk: `conn:${connectionId}` },
        })
      );
    }
  } catch (err) {
    console.error("disconnect cleanup error:", err);
  }

  return { statusCode: 200, body: "Disconnected" };
};
