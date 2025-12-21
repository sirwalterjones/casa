// PDF Generator utility for CASA reports
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export class PDFGenerator {
  static async generateComprehensiveReport(reportData: any) {
    try {
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('CASA Comprehensive Report', 20, 30);
      
      // Add case information
      doc.setFontSize(12);
      doc.text(`Case Number: ${reportData.caseNumber || 'N/A'}`, 20, 50);
      doc.text(`Child Name: ${reportData.childName || 'N/A'}`, 20, 65);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 80);
      
      // Add report content
      doc.text('Case Summary:', 20, 100);
      const summaryText = reportData.summary || 'No summary available';
      const splitSummary = doc.splitTextToSize(summaryText, 170);
      doc.text(splitSummary, 20, 115);
      
      // Save the PDF
      doc.save(`CASA_Report_${reportData.caseNumber || 'Unknown'}_${Date.now()}.pdf`);
      
      return { success: true, message: 'Report generated successfully' };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return { success: false, error: 'Failed to generate PDF report' };
    }
  }

  static async generateCourtReport(reportData: any) {
    try {
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('CASA Court Report', 20, 30);
      
      // Add case information
      doc.setFontSize(12);
      doc.text(`Case Number: ${reportData.caseNumber || 'N/A'}`, 20, 50);
      doc.text(`Child Name: ${reportData.childName || 'N/A'}`, 20, 65);
      doc.text(`Hearing Date: ${reportData.hearingDate || 'N/A'}`, 20, 80);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 95);
      
      // Add recommendations
      doc.text('CASA Recommendations:', 20, 115);
      const recommendationsText = reportData.recommendations || 'No recommendations provided';
      const splitRecommendations = doc.splitTextToSize(recommendationsText, 170);
      doc.text(splitRecommendations, 20, 130);
      
      // Save the PDF
      doc.save(`CASA_Court_Report_${reportData.caseNumber || 'Unknown'}_${Date.now()}.pdf`);
      
      return { success: true, message: 'Court report generated successfully' };
    } catch (error) {
      console.error('Error generating court report PDF:', error);
      return { success: false, error: 'Failed to generate court report PDF' };
    }
  }

  static async generateFromHTML(elementId: string, filename: string) {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with ID '${elementId}' not found`);
      }

      // Convert HTML to canvas
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');

      // Create PDF
      const doc = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      doc.save(filename);
      return { success: true, message: 'PDF generated successfully' };
    } catch (error) {
      console.error('Error generating PDF from HTML:', error);
      return { success: false, error: 'Failed to generate PDF from HTML' };
    }
  }
}