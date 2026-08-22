const logger = require('../utils/logger');

/**
 * Generates a CSV marksheet string from a list of evaluations
 * @param {Array} evaluations 
 */
const exportEvaluationsToCSV = (evaluations) => {
  try {
    const headers = [
      'Project Title',
      'Team Members',
      'Phase',
      'Evaluator',
      'Rubric Scores',
      'Total Marks',
      'Feedback Comments',
      'Date Evaluated'
    ];

    const rows = evaluations.map(e => {
      const projectTitle = e.projectId ? e.projectId.title : 'N/A';
      const team = e.projectId && e.projectId.teamMembers
        ? e.projectId.teamMembers.map(m => `${m.name} (${m.email})`).join('; ')
        : 'N/A';
      const phaseName = e.phase;
      const facultyName = e.evaluatorId ? e.evaluatorId.name : 'N/A';
      const scoresString = e.scores
        ? e.scores.map(s => `${s.criteriaName}: ${s.scoredMarks}/${s.maxMarks}`).join(' | ')
        : '';
      const total = e.totalScore;
      const comments = e.feedback ? e.feedback.replace(/"/g, '""') : '';
      const date = new Date(e.evaluatedAt).toLocaleDateString();

      return [
        `"${projectTitle}"`,
        `"${team}"`,
        `"${phaseName}"`,
        `"${facultyName}"`,
        `"${scoresString}"`,
        total,
        `"${comments}"`,
        `"${date}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  } catch (error) {
    logger.error(`Failed to format CSV: ${error.message}`);
    throw error;
  }
};

module.exports = {
  exportEvaluationsToCSV,
};
