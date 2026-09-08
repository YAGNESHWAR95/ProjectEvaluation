const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Deadline = require('../models/Deadline');
const Project = require('../models/Project');
const Evaluation = require('../models/Evaluation');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    const connUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_portal';
    await mongoose.connect(connUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Deadline.deleteMany({});
    await Project.deleteMany({});
    await Evaluation.deleteMany({});
    console.log('Cleared existing collections.');

    // 1. Create Deadlines
    const deadline1 = await Deadline.create({
      batch: 'Batch 2026',
      title: 'Capstone Phase 1 - Scoping & SRS',
      submissionStartDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // opened 3 days ago
      submissionEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),   // closes in 5 days
      isActive: true,
    });

    const deadline2 = await Deadline.create({
      batch: 'Batch 2027',
      title: 'Early Abstract Review',
      submissionStartDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // opens in 10 days
      submissionEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      isActive: false,
    });

    console.log('Submission deadlines seeded.');

    // 2. Create Users
    // Admin
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@university.edu',
      password: 'Admin@123',
      role: 'admin',
      department: 'Computer Science',
    });

    // Faculty Reviewers
    const faculty1 = await User.create({
      name: 'Dr. Aris Vance',
      email: 'faculty1@university.edu',
      password: 'Faculty@123',
      role: 'faculty',
      department: 'Computer Science',
      facultyId: 'FAC-701',
    });

    const faculty2 = await User.create({
      name: 'Prof. Chloe Mercer',
      email: 'faculty2@university.edu',
      password: 'Faculty@123',
      role: 'faculty',
      department: 'Information Technology',
      facultyId: 'FAC-702',
    });

    // Students
    const student1 = await User.create({
      name: 'Liam Vance',
      email: 'student1@university.edu',
      password: 'Student@123',
      role: 'student',
      department: 'Computer Science',
      rollNumber: 'CS26-001',
    });

    const student2 = await User.create({
      name: 'Sophia Vance',
      email: 'student2@university.edu',
      password: 'Student@123',
      role: 'student',
      department: 'Computer Science',
      rollNumber: 'CS26-002',
    });

    const student3 = await User.create({
      name: 'Ethan Mercer',
      email: 'student3@university.edu',
      password: 'Student@123',
      role: 'student',
      department: 'Computer Science',
      rollNumber: 'CS26-003',
    });

    console.log('User profiles (Admin, Faculty, Students) seeded successfully!');
    console.log('\n--- Test Credentials ---');
    console.log('1. Admin:   admin@university.edu    / Admin@123');
    console.log('2. Faculty: faculty1@university.edu / Faculty@123');
    console.log('3. Student: student1@university.edu / Student@123 (others student2, student3)');
    console.log('------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
};

seedData();
