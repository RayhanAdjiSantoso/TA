import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PDF = {
  // Fungsi untuk download PDF dari analisis
  downloadAnalisisPDF: async (selectedAnalisis, previewVisualisasi) => {
    if (!selectedAnalisis) {
      alert('Pilih salah satu analisis');
      return false;
    }
  
    const pdf = new jsPDF('p', 'mm', 'a4');
  
    try {
      // Judul dokumen
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const textWidth = pdf.getTextWidth(selectedAnalisis.judul);
      const xCentered = (pageWidth - textWidth) / 2;
      pdf.text(selectedAnalisis.judul, xCentered, 20);
  
      let yPosition = 30;
  
      // Rumusan Masalah
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Rumusan Masalah:', 20, yPosition);
      yPosition += 10;
  
      pdf.setFontSize(12);
      const splitRumusan = pdf.splitTextToSize(selectedAnalisis.masalah || '-', 170);
      pdf.text(splitRumusan, 20, yPosition);
      yPosition += splitRumusan.length * 7 + 10;
  
      // Visualisasi
      pdf.setFontSize(14);
      pdf.text('Visualisasi:', 20, yPosition);
      yPosition += 10;
  
      for (const vis of previewVisualisasi) {
        const chartElement = document.getElementById(`chart-${vis.id_visualisasi}`);
        if (chartElement) {
          const canvas = await html2canvas(chartElement);
          const imgData = canvas.toDataURL('image/png');
      
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const titleHeight = 5;
      
          if (yPosition + titleHeight + imgHeight > 280) {
            pdf.addPage();
            yPosition = 20;
          }
      
          pdf.setFontSize(12);
          pdf.text(vis.judul, 20, yPosition);
          yPosition += titleHeight;
      
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        }
      }      
  
      // Interpretasi Hasil
      pdf.setFontSize(14);
      pdf.text('Interpretasi Hasil:', 20, yPosition);
      yPosition += 10;
  
      pdf.setFontSize(12);
      const splitInterpretasi = pdf.splitTextToSize(selectedAnalisis.interpretasi_hasil || '-', 170);
      pdf.text(splitInterpretasi, 20, yPosition);
  
      pdf.save(`Analisis_${selectedAnalisis.judul.replace(/\s+/g, '_')}.pdf`);
      
      return true;
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat PDF. Silakan coba lagi.');
      return false;
    }
  }
};

export default PDF;