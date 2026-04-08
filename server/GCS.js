const { Storage } = require("@google-cloud/storage");
const path = require("path");

// Load service account directly
const storage = new Storage({
  keyFilename: path.join(__dirname, "./service-account.json"),
  projectId: process.env.GCP_PROJECT_ID
});

// Buckets
const buckets = {
  storeProducts: storage.bucket(process.env.STORE_PRODUCTS),
  storeLogos: storage.bucket(process.env.STORE_LOGOS),
  storeBanners: storage.bucket(process.env.STORE_BANNERS),
  storeDocuments: storage.bucket(process.env.STORE_DOCUMENTS),
  storePOA: storage.bucket(process.env.STORE_POA),
  proofOfResidence: storage.bucket(process.env.PROOF_OF_RESIDENCE),
};

// Upload file to bucket
async function uploadFileToBucket(file, bucket) {

  if (!bucket || typeof bucket.file !== "function") {
    throw new Error("Invalid bucket provided to uploadFileToBucket()");
  }

  if (!file) {
    throw new Error("No file provided for upload");
  }

  const fileName = `${Date.now()}-${file.originalname}`;
  const blob = bucket.file(fileName);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype,
  });

  return new Promise((resolve, reject) => {

    blobStream.on("error", (err) => {
      console.error("Upload error:", err);
      reject(err);
    });

    blobStream.on("finish", () => {

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

      console.log(`Uploaded to ${bucket.name}: ${blob.name}`);

      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
}

// Delete file from bucket
async function deleteFileFromBucket(bucket, fileUrl) {

  try {

    if (!fileUrl) return;

    const parts = fileUrl.split("/");
    const fileName = decodeURIComponent(parts.slice(4).join("/"));

    await bucket.file(fileName).delete();

    console.log(`Deleted file: ${fileName}`);

  } catch (err) {

    if (err.code === 404) {
      console.log("File not found, skipping delete...");
    } else {
      console.error("Delete failed:", err);
    }

  }
}

module.exports = {
  buckets,
  uploadFileToBucket,
  deleteFileFromBucket
};