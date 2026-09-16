const SS = SpreadsheetApp.getActiveSpreadsheet();

const SHEETS = {
  REG: "Registration",
  ADMIN: "Admin",
  TESTS: "AptitudeTests",
  QUESTIONS: "AptitudeQuestions",
  RESULTS: "TestResults",
  ATTENDANCE: "Attendance"
};

function doGet() {
  return json({success:true, message:"Python Boot Camp API is working"});
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;
    switch(action) {
      case "register": return registerStudent(body);
      case "login": return studentLogin(body);
      case "adminLogin": return adminLogin(body);
      case "getStudent": return getStudent(body);
      case "getTests": return getTests(body);
      case "getTest": return getTest(body);
      case "submitTest": return submitTest(body);
      case "getStudentResults": return getStudentResults(body);
      case "adminCreateTest": return adminCreateTest(body);
      case "adminAddQuestion": return adminAddQuestion(body);
      case "adminGetTests": return adminGetTests(body);
      case "adminGetStudents": return adminGetStudents(body);
      case "adminGetResults": return adminGetResults(body);
      default: return json({success:false, message:"Unknown action"});
    }
  } catch(err) {
    return json({success:false, message:err.message || String(err)});
  }
}

function sheet(name) {
  const s = SS.getSheetByName(name);
  if (!s) throw new Error("Sheet not found: " + name);
  return s;
}

function rows(name) {
  const s = sheet(name);
  const values = s.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== "")).map(r => {
    const o = {};
    headers.forEach((h,i) => o[h] = r[i]);
    return o;
  });
}

function append(name, obj) {
  const s = sheet(name);
  const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);
  s.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ""));
}

function clean(v) { return String(v == null ? "" : v).trim(); }
function lower(v) { return clean(v).toLowerCase(); }

function registerStudent(b) {
  const required = ["name","email","mobile","roll","department","year","division","college","password"];
  required.forEach(k => { if (!clean(b[k])) throw new Error("Please fill all required fields."); });
  if (!/^\d{10}$/.test(clean(b.mobile))) throw new Error("Mobile number must contain 10 digits.");
  if (clean(b.password).length < 6) throw new Error("Password must be at least 6 characters.");

  const existing = rows(SHEETS.REG).find(r => lower(r.Email) === lower(b.email) || lower(r.Roll) === lower(b.roll));
  if (existing) throw new Error("Email or Roll Number is already registered.");

  append(SHEETS.REG, {
    Timestamp: new Date(), Name: clean(b.name), Email: lower(b.email),
    Mobile: clean(b.mobile), Roll: clean(b.roll), Department: clean(b.department),
    Year: clean(b.year), Division: clean(b.division),
    College: "V.V.P.I.E.T. Solapur", Password: clean(b.password)
  });
  return json({success:true, message:"Registration successful!"});
}

function studentLogin(b) {
  const r = rows(SHEETS.REG).find(x => lower(x.Email) === lower(b.email) && clean(x.Password) === clean(b.password));
  if (!r) throw new Error("Invalid email or password.");
  return json({success:true, student:studentObject(r)});
}

function studentObject(r) {
  return {name:r.Name,email:r.Email,mobile:r.Mobile,roll:r.Roll,department:r.Department,year:r.Year,division:r.Division,college:r.College};
}

function adminLogin(b) {
  const r = rows(SHEETS.ADMIN).find(x => lower(x.Email) === lower(b.email) && clean(x.Password) === clean(b.password));
  if (!r) throw new Error("Invalid admin email or password.");
  return json({success:true, admin:{name:r.Name,email:r.Email}});
}

function getStudent(b) {
  const r = rows(SHEETS.REG).find(x => lower(x.Email) === lower(b.email));
  if (!r) throw new Error("Student not found.");
  return json({success:true, student:studentObject(r)});
}

function getTests() {
  const tests = buildTests(false);
  return json({success:true, tests:tests});
}

function buildTests(adminMode) {
  const testRows = rows(SHEETS.TESTS);
  const qRows = rows(SHEETS.QUESTIONS);
  const results = rows(SHEETS.RESULTS);
  return testRows.map(t => {
    const qs = qRows.filter(q => clean(q.TestID) === clean(t.TestID));
    const max = qs.reduce((sum,q) => sum + Number(q.Marks || t.MarksPerQuestion || 1), 0);
    return {
      testId: clean(t.TestID), testName: clean(t.TestName), description: clean(t.Description),
      duration: Number(t.DurationMinutes || 20), startDate: clean(t.StartDate), endDate: clean(t.EndDate),
      status: clean(t.Status || "Active"), questionCount: qs.length, maxScore: max
    };
  }).filter(t => adminMode || t.status.toLowerCase() === "active");
}

function getTest(b) {
  const t = rows(SHEETS.TESTS).find(x => clean(x.TestID) === clean(b.testId));
  if (!t) throw new Error("Test not found.");
  if (clean(t.Status).toLowerCase() !== "active") throw new Error("This test is not active.");

  const previous = rows(SHEETS.RESULTS).find(x => clean(x.TestID) === clean(b.testId) && lower(x.StudentEmail) === lower(b.email));
  if (previous) throw new Error("You have already completed this test.");

  const qs = rows(SHEETS.QUESTIONS).filter(q => clean(q.TestID) === clean(b.testId));
  if (!qs.length) throw new Error("This test has no questions yet.");

  return json({success:true, test:{
    testId:clean(t.TestID), testName:clean(t.TestName), description:clean(t.Description),
    duration:Number(t.DurationMinutes || 20),
    questions:qs.map(q => ({questionId:clean(q.QuestionID),question:clean(q.Question),
      optionA:clean(q.OptionA),optionB:clean(q.OptionB),optionC:clean(q.OptionC),optionD:clean(q.OptionD),
      marks:Number(q.Marks || t.MarksPerQuestion || 1)}))
  }});
}

function submitTest(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const t = rows(SHEETS.TESTS).find(x => clean(x.TestID) === clean(b.testId));
    if (!t) throw new Error("Test not found.");
    const student = rows(SHEETS.REG).find(x => lower(x.Email) === lower(b.email));
    if (!student) throw new Error("Student not found.");
    const prior = rows(SHEETS.RESULTS).find(x => clean(x.TestID) === clean(b.testId) && lower(x.StudentEmail) === lower(b.email));
    if (prior) throw new Error("You have already submitted this test.");

    const qs = rows(SHEETS.QUESTIONS).filter(q => clean(q.TestID) === clean(b.testId));
    const answers = b.answers || {};
    let correct = 0, attempted = 0, score = 0, maxScore = 0;
    qs.forEach(q => {
      const marks = Number(q.Marks || t.MarksPerQuestion || 1);
      maxScore += marks;
      const answer = clean(answers[clean(q.QuestionID)]).toUpperCase();
      if (answer) attempted++;
      if (answer && answer === clean(q.CorrectAnswer).toUpperCase()) {
        correct++; score += marks;
      }
    });
    const wrong = attempted - correct;
    const percentage = maxScore ? Math.round((score / maxScore) * 10000) / 100 : 0;
    const resultId = "RES-" + Utilities.getUuid().slice(0,8).toUpperCase();
    append(SHEETS.RESULTS, {
      Timestamp:new Date(), ResultID:resultId, TestID:clean(t.TestID), TestName:clean(t.TestName),
      StudentEmail:student.Email, StudentName:student.Name, TotalQuestions:qs.length,
      Attempted:attempted, Correct:correct, Wrong:wrong, Score:score, MaxScore:maxScore,
      Percentage:percentage, TimeTaken:Number(b.timeTaken || 0)
    });
    return json({success:true, score:score, maxScore:maxScore, percentage:percentage, correct:correct, wrong:wrong});
  } finally {
    lock.releaseLock();
  }
}

function getStudentResults(b) {
  const out = rows(SHEETS.RESULTS).filter(r => lower(r.StudentEmail) === lower(b.email)).map(resultObject);
  return json({success:true, results:out});
}

function resultObject(r) {
  return {timestamp:formatDate(r.Timestamp),testId:r.TestID,testName:r.TestName,studentName:r.StudentName,
    score:Number(r.Score||0),maxScore:Number(r.MaxScore||0),percentage:Number(r.Percentage||0)};
}

function adminCreateTest(b) {
  validateTestId(b.testId);
  if (!clean(b.testName)) throw new Error("Test name is required.");
  if (rows(SHEETS.TESTS).some(t => clean(t.TestID) === clean(b.testId))) throw new Error("Test ID already exists.");
  append(SHEETS.TESTS, {
    TestID:clean(b.testId), TestName:clean(b.testName), Description:clean(b.description),
    DurationMinutes:Number(b.duration||20), MarksPerQuestion:Number(b.marksPerQuestion||1),
    StartDate:clean(b.startDate), EndDate:clean(b.endDate), Status:clean(b.status||"Active"), CreatedAt:new Date()
  });
  return json({success:true,message:"Aptitude test created successfully."});
}

function validateTestId(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(clean(id))) throw new Error("Test ID can use letters, numbers, _ and - only.");
}

function adminAddQuestion(b) {
  if (!rows(SHEETS.TESTS).some(t => clean(t.TestID) === clean(b.testId))) throw new Error("Test ID does not exist. Create the test first.");
  if (rows(SHEETS.QUESTIONS).some(q => clean(q.QuestionID) === clean(b.questionId))) throw new Error("Question ID already exists.");
  ["question","optionA","optionB","optionC","optionD","correctAnswer"].forEach(k => { if (!clean(b[k])) throw new Error("Fill all question fields."); });
  append(SHEETS.QUESTIONS, {
    QuestionID:clean(b.questionId), TestID:clean(b.testId), Question:clean(b.question),
    OptionA:clean(b.optionA), OptionB:clean(b.optionB), OptionC:clean(b.optionC), OptionD:clean(b.optionD),
    CorrectAnswer:clean(b.correctAnswer).toUpperCase(), Marks:Number(b.marks||1)
  });
  return json({success:true,message:"Question added successfully."});
}

function adminGetTests() { return json({success:true,tests:buildTests(true)}); }

function adminGetStudents() {
  return json({success:true,students:rows(SHEETS.REG).map(studentObject)});
}

function adminGetResults() {
  return json({success:true,results:rows(SHEETS.RESULTS).map(resultObject)});
}

function formatDate(v) {
  if (!v) return "";
  try { return Utilities.formatDate(new Date(v), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm"); }
  catch(e) { return String(v); }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
