import jwt from "jsonwebtoken";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type WsEvent = {
  requestContext: { connectionId: string };
  queryStringParameters?: Record<string, string> | null;
};

type JwtWsPayload = {
  id?: number | string;
  userId?: number | string;
  [k: string]: unknown;
};

function getToken(event: WsEvent): string | null {
  return event.queryStringParameters?.token ?? null;
}

export const handler = async (event: WsEvent) => {
  const connectionId = event.requestContext.connectionId;

  const token = getToken(event);
  if (!token) return { statusCode: 401, body: "Missing token" };

  const secret = process.env.JWT_SECRET;
  if (!secret) return { statusCode: 500, body: "Missing JWT_SECRET" };

  let payload: JwtWsPayload;
  try {
    payload = jwt.verify(token, secret) as JwtWsPayload;
  } catch {
    return { statusCode: 401, body: "Invalid token" };
  }

  const rawUserId = payload.id ?? payload.userId;
  if (!rawUserId) return { statusCode: 401, body: "Token without user id" };

  const userId = String(rawUserId);

  // TTL renovable (2 minutos)
  const ttl = Math.floor(Date.now() / 1000) + 120;

  const table = process.env.WS_CONNECTIONS_TABLE;
  if (!table) return { statusCode: 500, body: "Missing WS_CONNECTIONS_TABLE" };

  // 1) Item por usuario -> conexiones
  await ddb.send(
    new PutCommand({
      TableName: table,
      Item: {
        pk: `user:${userId}`,
        sk: `conn:${connectionId}`,
        userId,
        connectionId,
        ttl,
      },
    })
  );

  // 2) Item invertido por conexión -> usuario
  await ddb.send(
    new PutCommand({
      TableName: table,
      Item: {
        pk: `conn:${connectionId}`,
        sk: "meta",
        userId,
        connectionId,
        ttl,
      },
    })
  );

  return { statusCode: 200, body: "Connected" };
};
