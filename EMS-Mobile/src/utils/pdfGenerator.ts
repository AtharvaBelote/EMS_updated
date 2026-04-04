import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

interface SlipData {
  companyName: string;
  companyAddress: string;
  period: string;
  paidMode: string;
  logoUrl?: string;
  stampUrl?: string;
  signUrl?: string;
  details: string[][];
  attendance: string[][];
  earnings: string[][];
  deductions: string[][];
  netSalary: string;
}

export const generateSalarySlipPDF = async (
  slipData: SlipData,
  employeeId: string,
  month: number,
  year: number
): Promise<void> => {
  try {
    const html = generateHTMLTemplate(slipData);
    
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const fileName = `salary_slip_${employeeId}_${month}_${year}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(newUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
      });
    } else {
      await Sharing.shareAsync(newUri);
    }

    Alert.alert('Success', 'Salary slip downloaded successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    Alert.alert('Error', 'Failed to generate salary slip PDF');
  }
};

const generateHTMLTemplate = (slipData: SlipData): string => {
  const detailsRows = slipData.details
    .map(
      ([label, value]) => `
      <tr>
        <td style="background-color: #f8fafc; font-weight: 600; padding: 6px 8px; border: 1px solid #d5d9df;">${label}</td>
        <td style="padding: 6px 8px; border: 1px solid #d5d9df;">${value}</td>
      </tr>
    `
    )
    .join('');

  const attendanceRows = slipData.attendance
    .map(
      (row) => `
      <tr>
        ${row.map((cell, idx) => `<td style="padding: 6px 8px; border: 1px solid #d5d9df; text-align: ${idx === 0 ? 'left' : 'right'};">${cell}</td>`).join('')}
      </tr>
    `
    )
    .join('');

  const earningsRows = slipData.earnings
    .map(
      (row, idx) => `
      <tr style="${idx === slipData.earnings.length - 1 ? 'font-weight: 700; background-color: #f4f8ff;' : ''}">
        ${row.map((cell, cellIdx) => `<td style="padding: 6px 8px; border: 1px solid #d5d9df; text-align: ${cellIdx === 0 ? 'left' : 'right'};">${cell}</td>`).join('')}
      </tr>
    `
    )
    .join('');

  const deductionsRows = slipData.deductions
    .map(
      (row, idx) => `
      <tr style="${idx === slipData.deductions.length - 1 ? 'font-weight: 700; background-color: #f4f8ff;' : ''}">
        ${row.map((cell, cellIdx) => `<td style="padding: 6px 8px; border: 1px solid #d5d9df; text-align: ${cellIdx === 0 ? 'left' : 'right'};">${cell}</td>`).join('')}
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 12px;
          color: #1f2937;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #1f2937;
          background: white;
        }
        .header {
          text-align: center;
          padding: 15px;
          border-bottom: 2px solid #1f2937;
          background: linear-gradient(180deg, #fff 0%, #fbfcff 100%);
          position: relative;
        }
        .logo {
          position: absolute;
          left: 15px;
          top: 15px;
          width: 50px;
          height: 50px;
          border: 2px solid #0f766e;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #d9f3ef;
          color: #0f766e;
          font-weight: 700;
          font-size: 18px;
        }
        .company-name {
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        .company-address {
          color: #6b7280;
          font-size: 11px;
          margin-bottom: 5px;
        }
        .period {
          font-weight: 700;
          margin-top: 5px;
        }
        .content {
          display: flex;
        }
        .left-section {
          flex: 1.2;
          border-right: 1px solid #1f2937;
        }
        .right-section {
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td, th {
          font-size: 10px;
          border: 1px solid #d5d9df;
        }
        th {
          background-color: #f8fafc;
          font-weight: 700;
          padding: 6px 8px;
        }
        .earnings-deductions {
          display: flex;
          border-top: 1px solid #1f2937;
        }
        .earnings {
          flex: 1.2;
          border-right: 1px solid #1f2937;
        }
        .deductions {
          flex: 1;
        }
        .net-pay {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background-color: #fafcff;
          border-top: 1px solid #1f2937;
          border-bottom: 1px solid #1f2937;
          font-weight: 700;
        }
        .net-pay-amount {
          color: #0b4a6d;
          font-size: 14px;
        }
        .paid-mode {
          text-align: center;
          padding: 10px;
          font-weight: 600;
          border-bottom: 1px solid #1f2937;
          background-color: #f9fafb;
        }
        .signatures {
          display: flex;
        }
        .signature-cell {
          flex: 1;
          border: 1px solid #d5d9df;
          padding: 30px 12px 12px;
          text-align: center;
          font-weight: 600;
          min-height: 80px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .footer {
          text-align: center;
          padding: 10px;
          font-size: 10px;
          color: #6b7280;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          ${slipData.logoUrl ? `<img src="${slipData.logoUrl}" alt="Logo" style="position: absolute; left: 15px; top: 15px; width: 50px; height: 50px; object-fit: cover;" />` : '<div class="logo">TW</div>'}
          <div class="company-name">${slipData.companyName}</div>
          <div class="company-address">${slipData.companyAddress}</div>
          <div class="period">Pay Slip for the month of ${slipData.period}</div>
        </div>

        <!-- Employee Details and Attendance -->
        <div class="content">
          <div class="left-section">
            <table>
              ${detailsRows}
            </table>
          </div>
          <div class="right-section">
            <table>
              <thead>
                <tr>
                  <th>Attendance / Leave</th>
                  <th>O.Bal</th>
                  <th>Ernd</th>
                  <th>Taken</th>
                  <th>C.Bal</th>
                </tr>
              </thead>
              <tbody>
                ${attendanceRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Earnings and Deductions -->
        <div class="earnings-deductions">
          <div class="earnings">
            <table>
              <thead>
                <tr>
                  <th>Allowance</th>
                  <th>Rate</th>
                  <th>Earned Wages</th>
                </tr>
              </thead>
              <tbody>
                ${earningsRows}
              </tbody>
            </table>
          </div>
          <div class="deductions">
            <table>
              <thead>
                <tr>
                  <th>Deduction</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${deductionsRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Net Pay -->
        <div class="net-pay">
          <span>Net Pay</span>
          <span class="net-pay-amount">${slipData.netSalary}</span>
        </div>

        <!-- Paid Mode -->
        <div class="paid-mode">${slipData.paidMode}</div>

        <!-- Signatures -->
        <div class="signatures">
          <div class="signature-cell">Employee's Sign</div>
          <div class="signature-cell">Checked By</div>
          <div class="signature-cell">
            ${slipData.stampUrl ? `<img src="${slipData.stampUrl}" alt="Stamp" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 5px;" />` : ''}
            ${slipData.signUrl ? `<img src="${slipData.signUrl}" alt="Sign" style="width: 90px; height: 30px; object-fit: cover;" />` : ''}
            ${!slipData.stampUrl && !slipData.signUrl ? 'Company Stamp and Sign' : ''}
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          This is a computer generated document. No signature required.
        </div>
      </div>
    </body>
    </html>
  `;
};
