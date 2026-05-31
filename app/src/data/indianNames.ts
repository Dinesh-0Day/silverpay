/** 1000+ unique Indian display names (first + surname combinations). */
const FIRST = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
  "Shaurya", "Atharv", "Advik", "Pranav", "Advaith", "Kabir", "Ritvik", "Aarush", "Kiaan", "Anirudh",
  "Rohan", "Dev", "Yash", "Karan", "Rahul", "Amit", "Suresh", "Ramesh", "Vikram", "Sanjay",
  "Deepak", "Manoj", "Ajay", "Vijay", "Anil", "Sunil", "Ravi", "Gopal", "Mohan", "Nitin",
  "Pradeep", "Ashok", "Rakesh", "Mahesh", "Dinesh", "Harish", "Gaurav", "Naveen", "Pankaj", "Sachin",
  "Varun", "Akash", "Harsh", "Kunal", "Nikhil", "Rishabh", "Siddharth", "Tarun", "Uday", "Vinay",
  "Abhishek", "Chirag", "Dhruv", "Eshan", "Farhan", "Gagan", "Himanshu", "Imran", "Jatin", "Kartik",
  "Lokesh", "Mayank", "Neeraj", "Omkar", "Parth", "Qadir", "Ritesh", "Sahil", "Tushar", "Utkarsh",
  "Vivek", "Wasim", "Yogesh", "Zeeshan", "Aman", "Bhavesh", "Chetan", "Darshan", "Ekta", "Faisal",
  "Girish", "Hitesh", "Irfan", "Jayesh", "Kamlesh", "Lalit", "Mukesh", "Naresh", "Omprakash", "Piyush",
  "Rajesh", "Shivam", "Tejas", "Umesh", "Vishal", "Waseem", "Yuvraj", "Zubair", "Ankit", "Bharat",
  "Chandan", "Dilip", "Ganesh", "Hemant", "Indrajit", "Jagdish", "Kishore", "Laxman", "Madhav", "Nagesh",
  "Ojas", "Prakash", "Raghav", "Shyam", "Trilok", "Udayan", "Venkatesh", "Yogendra", "Zaid", "Aakash",
  "Priya", "Ananya", "Aadhya", "Diya", "Ira", "Myra", "Sara", "Anika", "Navya", "Kiara",
  "Pooja", "Neha", "Sneha", "Kavita", "Anjali", "Ritu", "Sunita", "Geeta", "Meena", "Rekha",
  "Shanti", "Lakshmi", "Durga", "Kiran", "Nisha", "Divya", "Swati", "Tanvi", "Ishita", "Riya",
  "Shreya", "Aishwarya", "Kritika", "Muskan", "Palak", "Simran", "Harpreet", "Gurleen", "Manpreet", "Jasleen",
  "Fatima", "Ayesha", "Zara", "Hina", "Sana", "Nazia", "Rubina", "Shabana", "Reshma", "Nasreen",
];

const LAST = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Yadav", "Patel", "Shah", "Reddy", "Rao",
  "Nair", "Menon", "Pillai", "Iyer", "Iyengar", "Joshi", "Kulkarni", "Deshmukh", "Patil", "Naik",
  "Mehta", "Kapoor", "Malhotra", "Chopra", "Bhatia", "Sethi", "Arora", "Khanna", "Aggarwal", "Bansal",
  "Goyal", "Mittal", "Saxena", "Tiwari", "Pandey", "Mishra", "Dubey", "Shukla", "Tripathi", "Srivastava",
  "Chauhan", "Rathore", "Solanki", "Parmar", "Thakur", "Bisht", "Rawat", "Bhandari", "Negi", "Bora",
  "Das", "Deka", "Baruah", "Gogoi", "Hazarika", "Kalita", "Mandal", "Mukherjee", "Banerjee", "Chatterjee",
  "Ghosh", "Bose", "Sen", "Roy", "Dutta", "Kar", "Pal", "Saha", "Halder", "Maity",
  "Khatri", "Chaudhary", "Tomar", "Gurjar", "Jat", "Ahir", "Gowda", "Hegde", "Shetty", "Murthy",
  "Krishnan", "Subramanian", "Venkatesan", "Raman", "Natarajan", "Balaji", "Chandran", "Perumal", "Selvam", "Pandian",
  "Ansari", "Sheikh", "Khan", "Pathan", "Qureshi", "Siddiqui", "Hashmi", "Mirza", "Malik", "Hussain",
  "Ali", "Ahmed", "Rizvi", "Farooqui", "Usmani", "Zaidi", "Abbasi", "Gilani", "Bhat", "Dar",
  "Lone", "Wani", "Rather", "Mir", "Choudhury", "Saikia", "Phukan", "Barman", "Deb", "Nath",
  "Pawar", "Jadhav", "More", "Shinde", "Gaikwad", "Bhosale", "Kadam", "Salvi", "Rane", "Sawant",
  "Gill", "Dhillon", "Sandhu", "Brar", "Cheema", "Bajwa", "Sidhu", "Mann", "Grewal", "Sohi",
  "Kaur", "Kaur", "Randhawa", "Ahluwalia", "Chahal", "Pannu", "Virk", "Saini", "Beniwal", "Godara",
];

function buildIndianNamePool(): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const first of FIRST) {
    for (const last of LAST) {
      const full = `${first} ${last}`;
      if (seen.has(full)) continue;
      seen.add(full);
      names.push(full);
      if (names.length >= 1200) return names;
    }
  }
  return names;
}

export const INDIAN_NAMES = buildIndianNamePool();
