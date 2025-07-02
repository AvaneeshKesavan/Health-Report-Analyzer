/*
 * @fileoverview This file contains the logic for extracting health parameters from text.
 * It uses a robust, multi-stage process involving text cleaning and regex matching
 * to achieve high accuracy with a wide range of lab report formats.
 */

/**
 * Pre-processes the raw OCR text to correct common errors and normalize the content.
 * This is a critical step for improving the accuracy of the extraction logic.
 * @param {string} text The raw text from OCR.
 * @returns {string} The cleaned and normalized text.
 */
function cleanOcrText(text) {
  return text
    .replace(/»/g, '>') // Corrects OCR errors where > is read as »
    .replace(/mg\/ol\./gi, 'mg/dL') // Corrects unit misspellings
    .replace(/Cholesterol\. Total/gi, 'Cholesterol, Total') // Normalizes parameter names
    .replace(/Trglycendeos/gi, 'Triglycerides') // Corrects common OCR misspellings
    .replace(/Leu ocyte/gi, 'Leukocyte') // Fixes spacing errors in names
    .replace(/Caiculatea/gi, 'Calculated') // Fix common OCR error
    // Corrects values where a space is used instead of a decimal point (e.g., "42 20" -> "42.20")
    .replace(/(\d+)\s+(\d+)/g, '$1.$2');
}

// A comprehensive list of health parameters with flexible matching patterns.
const HEALTH_PARAMETERS = [
  // Lipid Panel
  { name: 'Total Cholesterol', patterns: [/total cholesterol/i, /cholesterol, total/i] },
  { name: 'HDL Cholesterol', patterns: [/hdl cholesterol/i, /hdl-c/i] },
  { name: 'LDL Cholesterol', patterns: [/ldl cholesterol/i, /ldl-c/i, /ldl cholesterol, calculated/i] },
  { name: 'VLDL Cholesterol', patterns: [/vldl cholesterol/i, /vldl cholesterol, calculated/i] },
  { name: 'Non-HDL Cholesterol', patterns: [/non-hdl cholesterol/i] },
  { name: 'Triglycerides', patterns: [/triglycerides/i] },

  // Glucose
  { name: 'Glucose', patterns: [/glucose/i, /blood sugar/i] },
  { name: 'Hemoglobin A1c', patterns: [/hemoglobin a1c/i, /hba1c/i] },

  // Complete Blood Count (CBC)
  { name: 'White Blood Cell Count', patterns: [/white blood cell count/i, /wbc/i, /leukocyte count/i] },
  { name: 'Red Blood Cell Count', patterns: [/red blood cell count/i, /rbc/i] },
  { name: 'Hemoglobin', patterns: [/hemoglobin/i, /hgb/i] },
  { name: 'Hematocrit', patterns: [/hematocrit/i, /hct/i] },
  { name: 'Platelet Count', patterns: [/platelet count/i, /plt/i] },
  { name: 'MCV', patterns: [/mcv/i, /mean corpuscular volume/i] },
  { name: 'MCH', patterns: [/mch/i, /mean corpuscular hemoglobin/i] },
  { name: 'MCHC', patterns: [/mchc/i, /mean corpuscular hemoglobin concentration/i] },
  { name: 'RDW', patterns: [/rdw/i, /red cell distribution width/i] },
  { name: 'Neutrophils', patterns: [/neutrophils/i, /neut/i] },
  { name: 'Lymphocytes', patterns: [/lymphocytes/i, /lymph/i] },
  { name: 'Monocytes', patterns: [/monocytes/i, /mono/i] },
  { name: 'Eosinophils', patterns: [/eosinophils/i, /eos/i] },
  { name: 'Basophils', patterns: [/basophils/i, /baso/i] },
  { name: 'Absolute Neutrophils', patterns: [/absolute neutrophils/i, /anc/i] },
  { name: 'Absolute Lymphocytes', patterns: [/absolute lymphocytes/i, /alc/i] },
  { name: 'Absolute Monocytes', patterns: [/absolute monocytes/i] },
  { name: 'Absolute Eosinophils', patterns: [/absolute eosinophils/i] },
  { name: 'Absolute Basophils', patterns: [/absolute basophils/i] },

  // Comprehensive Metabolic Panel (CMP)
  { name: 'Sodium', patterns: [/sodium/i] },
  { name: 'Potassium', patterns: [/potassium/i] },
  { name: 'Chloride', patterns: [/chloride/i] },
  { name: 'Bicarbonate', patterns: [/bicarbonate/i, /co2/i] },
  { name: 'BUN', patterns: [/bun/i, /blood urea nitrogen/i] },
  { name: 'Creatinine', patterns: [/creatinine/i] },
  { name: 'Calcium', patterns: [/calcium/i] },
  { name: 'Total Protein', patterns: [/total protein/i] },
  { name: 'Albumin', patterns: [/albumin/i] },
  { name: 'AST', patterns: [/ast/i, /aspartate aminotransferase/i] },
  { name: 'ALT', patterns: [/alt/i, /alanine aminotransferase/i] },
  { name: 'Alkaline Phosphatase', patterns: [/alkaline phosphatase/i, /alp/i] },
];

// Regex to find a numeric value, a unit, and a reference range.
// It captures the first number as the value, an optional unit, and the rest as the range.
const EXTRACTION_REGEX = new RegExp(
  // Value: captures floating point or integer numbers
  '([\\d\\.]+)\\s*' +
  // Unit: captures common units, allows for flexible characters
  '([a-zA-Z%^/\\d\\.\\-]*[a-zA-Z%])?\\s*' +
  // Range: captures various range formats (e.g., '70-100', '<100', '>40')
  '([<>\\d\\.\\s-]+)?'
);

/**
 * Determines if a given value is outside the normal range.
 * @param {number} value The parameter's value.
 * @param {string} range The normal range (e.g., '70-100', '<100', '>40').
 * @returns {string} The status ('Normal', 'High', 'Low', 'Unknown').
 */
function getStatus(value, range) {
  if (!range || isNaN(value)) return 'Unknown';

  const cleanedRange = range.replace(/,/g, '').trim();

  if (cleanedRange.startsWith('<')) {
    const max = parseFloat(cleanedRange.substring(1));
    if (isNaN(max)) return 'Unknown';
    return value >= max ? 'High' : 'Normal';
  } else if (cleanedRange.startsWith('>')) {
    const min = parseFloat(cleanedRange.substring(1));
    if (isNaN(min)) return 'Unknown';
    return value <= min ? 'Low' : 'Normal';
  } else if (cleanedRange.includes('-')) {
    const [min, max] = cleanedRange.split('-').map(s => parseFloat(s.trim()));
    if (isNaN(min) || isNaN(max)) return 'Unknown';
    if (value < min) return 'Low';
    if (value > max) return 'High';
    return 'Normal';
  }
  return 'Unknown';
}

/**
 * Extracts health parameters from a block of text using a more generalized approach.
 * @param {string} text The text extracted from a lab report.
 * @returns {Array<Object>} A list of extracted health parameters.
 */
function extractHealthParameters(text) {
  const cleanedText = cleanOcrText(text);
  const lines = cleanedText.split('\n');
  const extracted = new Map(); // Use a map to avoid duplicate parameter entries

  for (const line of lines) {
    let lineProcessed = false; // Flag to check if the line has been processed
    for (const param of HEALTH_PARAMETERS) {
      // Skip if parameter has already been found
      if (extracted.has(param.name)) continue;

      for (const pattern of param.patterns) {
        const match = line.match(pattern);
        if (match) {
          // Remove the matched parameter name to isolate the values
          const restOfLine = line.substring(match.index + match[0].length).trim();

          // Use a more robust regex to find value, unit, and range
          const valueMatch = restOfLine.match(EXTRACTION_REGEX);

          if (valueMatch && valueMatch[1]) {
            const value = parseFloat(valueMatch[1]);
            const unit = valueMatch[2] ? valueMatch[2].trim() : 'Unknown';
            const normalRange = valueMatch[3] ? valueMatch[3].trim() : 'Unknown';

            if (!isNaN(value)) {
              extracted.set(param.name, {
                name: param.name,
                value: value,
                unit: unit,
                normalRange: normalRange,
                status: getStatus(value, normalRange),
                category: 'Lab Result',
              });
              lineProcessed = true; // Mark line as processed
              break; // Exit the pattern loop
            }
          }
        }
      }
      if (lineProcessed) break; // If line is processed, move to the next line
    }
  }

  return Array.from(extracted.values());
}

module.exports = { extractHealthParameters };
