import prisma from "../config/db.js";
import cloudinary from "../config/cloudinary.js";

export const createEvent=async(req,res)=>{
try{
    const{name,artist,city,venue,date,image}=req.body;

  if (!name || !artist || !city || !venue || !date) {
      return res.status(400).json({
        error: "Missing required fields (name, artist, city, venue, date)",
      });
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    let imageUrl = image || req.file?.path || null;

    if (req.file?.path) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "ticket_nova_events",
        resource_type: "image",
      });
      imageUrl = uploadResult.secure_url;
    } else if (image && typeof image === "string" && image.trim() !== "") {
      imageUrl = image.trim();
    }

   const result= await prisma.$queryRaw`
   INSERT INTO "Event"("id","name","artist","city","venue","date","imageUrl","createdAt")
   VALUES(gen_random_uuid(),${name},${artist},${city},${venue},${parsedDate},${imageUrl},NOW())
   RETURNING "id","name","artist","city","venue","date","imageUrl","createdAt"`

   res.status(201).json(result[0]);

}catch(error){
console.error("SQL Error:", error.message);

    res.status(500).json({ 
      error: "Event cannot be created", 
      details: error.message 
    });

}
}



//pagination 
export const getAllEvents=async(req,res)=>{
try{

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

    const skip=(page-1)*limit;
  

  const result=await prisma.$queryRaw`
  SELECT id,name,artist,city,venue,date,"imageUrl","createdAt" FROM "Event" ORDER BY "createdAt" DESC
      LIMIT ${limit+1} OFFSET ${skip}`

      //if no more record left send empty array to save frontend code from crashing
      if(result.length==0){
        return res.status(200).json({
          success:true,
          message:"NO More Records Left",
          data:[],
          hasnextpage:false
        })
      }

      //now the length can be greater(11,12,34) or smaller(8,7)records left
      const hasMore=result.length>limit ; //note limit=10
      if(hasMore){
        result.pop();
      }
      
        return res.status(200).json({
          success:true,
          message:hasMore?"more records are there":"no records after last page",
          data:result,
          hasnextpage:hasMore
        })
     



}catch(error){
  console.error("SQL Error:", error.message);

    res.status(500).json({ 
      error: "Event cannot be get", 
      details: error.message 
    });
}

}

export const getEventAndSeatsCategory=async(req,res)=>{
try{

    const result=await prisma.$queryRaw`
    select "Event".name,"Event".venue,"SeatCategory".type,"SeatCategory".price FROM "Event" INNER JOIN "SeatCategory"
    ON "Event".id="SeatCategory"."eventId"`

 
    const grouped = {};

    for (const row of result) {
      const key = row.name; 
      
      if (!grouped[key]) {
        grouped[key] = {
          name: row.name,
          venue: row.venue,
          seatCategories: [] 
        };
      }

      
      grouped[key].seatCategories.push({
        type: row.type,
        price: row.price
      });
    }

  
    res.json(Object.values(grouped));



}catch(error){
  console.error("SQL Error:", error.message);

    res.status(500).json({ 
      error: " cannot be get Events and Seatcatrgory", 
      details: error.message 
    });
}
}

//serach logic
export const searchEvents = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const likePattern = `%${q}%`;

    const events = await prisma.$queryRaw`
      SELECT
        e.id,
        e.name,
        e.artist,
        e.city,
        e.venue,
        e.date,
        e."imageUrl",
        e."createdAt",
        ts_rank(e.search_vector, plainto_tsquery('english', ${q})) AS relevance
      FROM "Event" e
      WHERE
        e.search_vector @@ plainto_tsquery('english', ${q})
        OR e.name ILIKE ${likePattern}
        OR e.artist ILIKE ${likePattern}
        OR e.city ILIKE ${likePattern}
        OR e.venue ILIKE ${likePattern}
      ORDER BY relevance DESC, e."createdAt" DESC
      LIMIT 15;
    `;

    res.status(200).json(events);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Database search failed" });
  }
};