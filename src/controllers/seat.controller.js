import prisma from "../config/db.js";

export const generateSeats=async(req,res)=>{
  try{

        
        const atTime=40;
      const{numSeat,EventName,CategoryType}=req.body;


        //so take required feilds from tables and join them based on foergin keys
    const query1=await prisma.$queryRaw`Select "Event".id,"SeatCategory".id as c FROM "Event" INNER JOIN "SeatCategory" ON "Event".id="SeatCategory"."eventId" Where "Event".name=${EventName} AND "SeatCategory".type=${CategoryType}`
        
    if (query1.length === 0) {
            return res.status(404).json({ 
                error: "Data does not match." 
            });
        }
    
          
    let currentSeat=0;

    while(currentSeat!=numSeat){
         const seatarr=[];
        
    for(let i=0;i<atTime;i++){

        if(currentSeat==numSeat)break;

        seatarr.push({
            seatNo:`${CategoryType[0].toUpperCase()}${currentSeat+1}`,
            status:"AVAILABLE",
            categoryId:query1[0].c
        })
        currentSeat++;
    }

    const result=await prisma.seat.createMany({
        data:seatarr,
        skipDuplicates:true
    })
}
     res.status(201).json({
            success: true,
            message: `${currentSeat} seats successfully created`
        });

    

  }catch(error){
    console.error("Error:", error.message);
        res.status(500).json({ error: "seats cant be generated" });
  }

}

export const getSeatsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const seats = await prisma.$queryRaw`
      SELECT
        s.id,
        s."seatNo",
        s.status,
        s."categoryId",
        sc.type AS "categoryType",
        sc.price
      FROM "Seat" s
      INNER JOIN "SeatCategory" sc ON s."categoryId" = sc.id
      WHERE sc."eventId" = ${eventId}
      ORDER BY s."seatNo" ASC
    `;

    res.status(200).json({
      success: true,
      data: seats,
    });
  } catch (err) {
    console.error('Error fetching seats:', err.message);
    res.status(500).json({ message: 'Failed to fetch seats' });
  }
};