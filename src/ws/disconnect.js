import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const table = process.env.WS_CONNECTIONS_TABLE;

  try {
    // Buscar meta de la conexión para obtener userId
    const metaRes = await ddb.send(
      new GetCommand({
        TableName: table,
        Key: { pk: `conn:${connectionId}`, sk: "meta" },
      })
    );

    const meta = metaRes?.Item;
    const userId = meta?.userId;

    // Borrar item invertido
    await ddb.send(
      new DeleteCommand({
        TableName: table,
        Key: { pk: `conn:${connectionId}`, sk: "meta" },
      })
    );

    // Si sabemos el userId, borrar también el item user->conn
    if (userId) {
      await ddb.send(
        new DeleteCommand({
          TableName: table,
          Key: { pk: `user:${userId}`, sk: `conn:${connectionId}` },
        })
      );
    }
  } catch (err) {
    // No queremos fallar el disconnect por limpieza
    console.error("disconnect cleanup error:", err);
  }

  return { statusCode: 200, body: "Disconnected" };
};
