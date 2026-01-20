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
  const tag = "[WS:$connect]";

  // Log inicial (para saber si llega token/env/table)
  console.log(`${tag} start`, {
    connectionId: event?.requestContext?.connectionId,
    hasQueryString: !!event?.queryStringParameters,
    hasToken: !!event?.queryStringParameters?.token,
    hasJWT_SECRET: !!process.env.JWT_SECRET,
    table: process.env.WS_CONNECTIONS_TABLE ?? null,
  });

  try {
    const connectionId = event.requestContext.connectionId;

    const token = getToken(event);
    if (!token) {
      console.warn(`${tag} Missing token`);
      return { statusCode: 401, body: "Missing token" };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error(`${tag} Missing JWT_SECRET env var`);
      return { statusCode: 500, body: "Missing JWT_SECRET" };
    }

    let payload: JwtWsPayload;
    try {
      payload = jwt.verify(token, secret) as JwtWsPayload;
    } catch (err: any) {
      console.warn(`${tag} Invalid token`, err?.name, err?.message);
      return { statusCode: 401, body: "Invalid token" };
    }

    const rawUserId = payload.id ?? payload.userId;
    if (!rawUserId) {
      console.warn(`${tag} Token without user id`, { payload });
      return { statusCode: 401, body: "Token without user id" };
    }

    const userId = String(rawUserId);

    const table = process.env.WS_CONNECTIONS_TABLE;
    if (!table) {
      console.error(`${tag} Missing WS_CONNECTIONS_TABLE env var`);
      return { statusCode: 500, body: "Missing WS_CONNECTIONS_TABLE" };
    }

    // TTL renovable (2 minutos)
    const ttl = Math.floor(Date.now() / 1000) + 120;

    console.log(`${tag} resolved`, { userId, connectionId, ttl, table });

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

    console.log(`${tag} ✅ stored connection`, { userId, connectionId });
    return { statusCode: 200, body: "Connected" };
  } catch (err: any) {
    // Esto es CLAVE: aquí vas a ver si es AccessDenied, tabla mal, región, etc.
    console.error(
      `${tag} ❌ FATAL`,
      err?.name,
      err?.message,
      err?.$metadata?.httpStatusCode,
      err
    );
    return { statusCode: 500, body: "Internal error" };
  }
};
