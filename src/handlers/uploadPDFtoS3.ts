import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3 } from "aws-sdk";
import { PutObjectRequest } from "aws-sdk/clients/s3";
import { v4 as uuidv4 } from "uuid";
import { PDFDocument } from "@cantoo/pdf-lib";

interface RequestData {
  file: string;
  password?: string;
}

const objS3 = new S3();
const BUCKET_NAME = process.env.BUCKET_NAME || "";
const BASE_URL = process.env.BASE_URL || "";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No file data provided" }),
      };
    }

    const data = JSON.parse(event.body || "{}") as RequestData;
    const fileName = `${uuidv4()}.pdf`;

    const pdfBuffer = Buffer.from(data.file, "base64");
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      password: data.password || '',
    });

    const decryptedPdfBytes = await pdfDoc.save();
    const decryptedPdfBuffer = Buffer.from(decryptedPdfBytes);

    // Upload parameters
    const params: PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: decryptedPdfBuffer,
      ContentType: "application/pdf",
    };

    // Upload to S3
    await objS3.putObject(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "File uploaded successfully",
        filename: `${BASE_URL}/${fileName}`,
      }),
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error uploading file" }),
    };
  }
};
