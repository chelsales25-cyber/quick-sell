function formatDateDDMMYY(dateValue) {
  var date = new Date(dateValue);
  var dd = String(date.getDate()).padStart(2, "0");
  var mm = String(date.getMonth() + 1).padStart(2, "0");
  var yy = String(date.getFullYear()).slice(-2);
  return dd + "/" + mm + "/" + yy;
}

function transferAndMapData() {
  // ตั้งค่าชื่อชีทต้นทางและปลายทาง
  var sourceSheetName = "GOOGLE_FORM"; // เปลี่ยนเป็นชื่อชีทจริงของคุณ
  var destinationSheetName = "ARTRN"; // เปลี่ยนเป็นชื่อชีทจริงของคุณ

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sourceSheet = ss.getSheetByName(sourceSheetName);
  var destinationSheet = ss.getSheetByName(destinationSheetName);
  //  const mapping = {
  //   invoiceId: 0, // A: เลขที่ใบเสร็จ (อาจว่าง)
  //   orderNo: 1, // B: อ้างอิง (orderNo)
  //   date: 2, // C: วันที่
  //   customerId: 3, // D: รหัสลูกค้า
  //   sellerId: 4, // E: รหัสพนักงาน (seller id)
  //   warehouseId: 5, // F: รหัสคลังสินค้า
  //   productId: 6, // G: รหัสสินค้า
  //   quantity: 7, // H: จำนวน
  //   unit: 8, // I: หน่วยนับ
  //   price: 9, // J: ราคาต่อหน่วย
  //   discount: 10, // K: ส่วนลด
  //   fullPrice: 11, // L: ราคาเต็ม
  //   vat: 12, // M: vat
  //   total: 13, // N: รวมทั้งสิ้น
  //   promo: 14, // O: รหัสโปรโมชั่น
  //   next: 15, // P: NEXT
  //   sellerName: 16, // Q: ชื่อพนักงาน
  //   customerName: 17, // R: ชื่อลูกค้า
  //   phone: 18, // S: เบอร์โทร
  //   address: 19, // T: ที่อยู่ลูกค้า
  //   paymentMethod: 20, // U: ช่องทางการชำระเงิน
  //   status: 21, // V: สถานะ
  //   cancellationNote: 22, // W: หมายเหตุ
  //   productName: 23, // X: ชื่อสินค้า
  // };

  // กำหนดการแมปคอลัมน์: [คอลัมน์ต้นทาง, คอลัมน์ปลายทาง]
  // ให้ดูจาก Header ที่คุณให้มา
  var columnMapping = [
    { sourceCol: "A", destCol: "C" }, // ประทับเวลา -> date
    { sourceCol: "B", destCol: "Y" }, // ข้อมูลสินค้า -> รหัสสินค้า
    { sourceCol: "C", destCol: "E" }, // รหัสพนักงานขาย -> รหัสพนักงาน
    { sourceCol: "D", destCol: "D" }, // รหัสลูกค้า -> Code Cutomer
    { sourceCol: "E", destCol: "R" }, // ชื่อลูกค้า -> cutomer name
    { sourceCol: "F", destCol: "H" }, // จำนวน -> จำนวน
    { sourceCol: "G", destCol: "I" }, // หน่วยนับ -> หน่วยนับ //ไม่มีในชีทใหม่
    { sourceCol: "H", destCol: "J" }, // ราคาต่อหน่วย -> ราคาต่อหน่วย
    { sourceCol: "I", destCol: "K" }, // ส่วนลด -> ส่วนลด
    { sourceCol: "J", destCol: "O" }, // โปรโมชั่น -> โปรโมชัน
  ];

  // อ่านข้อมูลทั้งหมดจากชีทต้นทาง (ไม่รวม Header)
  var sourceLastRow = sourceSheet.getLastRow();
  var sourceLastCol = sourceSheet.getLastColumn();
  if (sourceLastRow <= 1) {
    // ตรวจสอบว่ามีข้อมูลใหม่หรือไม่
    Logger.log("ไม่มีข้อมูลใหม่ให้ย้าย.");
    return;
  }
  var dataToTransfer = sourceSheet
    .getRange(2, 1, sourceLastRow - 1, sourceLastCol)
    .getValues();

  // หาแถวสุดท้ายของข้อมูลในชีทปลายทางเพื่อเพิ่มข้อมูลใหม่ต่อท้าย
  var destinationLastRow = destinationSheet.getLastRow();

  // สร้าง Array สำหรับข้อมูลที่จะนำไปวางในชีทปลายทาง
  var newData = [];

  // วนลูปเพื่อแมปข้อมูลจากต้นทางไปปลายทาง
  for (var i = 0; i < dataToTransfer.length; i++) {
    var sourceRow = dataToTransfer[i];
    var newRow = new Array(20).fill("");
    columnMapping.forEach(function (map) {
      var sourceIdx = map.sourceCol.charCodeAt(0) - 65; // 'A' = 0
      var destIdx = map.destCol.charCodeAt(0) - 65;
      if (map.sourceCol === "A") {
        newRow[destIdx] = formatDateDDMMYY(sourceRow[sourceIdx]);
      } else if (map.sourceCol === "B") {
        const fullText = sourceRow[sourceIdx].split(" ");
        const productCode = fullText[0].trim();
        const productName = fullText.slice(1).join(" ");
        newRow[6] = productCode;
        newRow[23] = productName; // สมมติว่าชื่อสินค้าอยู่ถัดไปอีกคอลัมน์
      } else if (
        map.sourceCol === "J" &&
        typeof sourceRow[sourceIdx] === "number"
      ) {
        // ถ้าเป็นเปอร์เซ็นต์ (เช่น 0.1) ให้แปลงเป็น "10%"
        newRow[destIdx] = (sourceRow[sourceIdx] * 100).toString() + "%";
      } else {
        newRow[destIdx] = sourceRow[sourceIdx];
      }
    });
    const orderNo = `SALE-${String(Date.now()).slice(-10)}`;
    newRow[1] = orderNo;
    if (
      newRow.some((cell) => cell !== "" && cell !== null && cell !== undefined)
    ) {
      newData.push(newRow);
    }
  }

  var emptyRow = new Array(newData[0].length).fill("-");
  newData.unshift(emptyRow);

  // วางข้อมูลที่แมปเสร็จแล้วลงในชีทปลายทาง
  destinationSheet
    .getRange(destinationLastRow + 1, 1, newData.length, newData[0].length)
    .setValues(newData);

  // ลบข้อมูลในชีทต้นทาง (ไม่รวม Header)
  if (sourceLastRow > 1) {
    sourceSheet.deleteRows(2, sourceLastRow - 1);
  }
}
// Trigger function ที่จะทำงานเมื่อมีการแก้ไขข้อมูลในชีท
function onFormSubmit(e) {
  var sourceSheetName = "GOOGLE_FORM";
  var editedSheet = e.source.getActiveSheet();

  if (editedSheet.getName() === sourceSheetName) {
    transferAndMapData();
  }
}
