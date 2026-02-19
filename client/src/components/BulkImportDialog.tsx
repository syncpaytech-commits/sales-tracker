import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import * as XLSX from 'xlsx';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const bulkImport = trpc.leads.bulkImport.useMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      let parsedData: any[] = [];

      if (fileType === 'csv') {
        // Parse CSV
        const text = await selectedFile.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        // Parse Excel
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        toast.error("Unsupported file type. Please upload CSV or Excel (.xlsx, .xls) files.");
        setFile(null);
        return;
      }

      setPreview(parsedData.slice(0, 5)); // Show first 5 rows
      toast.success(`Parsed ${parsedData.length} rows from ${fileType.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to parse file. Please check the format.");
      setFile(null);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setImporting(true);

    try {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      let parsedData: any[] = [];

      if (fileType === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = XLSX.utils.sheet_to_json(firstSheet);
      }

      // Map parsed data to lead format
      const leads = parsedData.map(row => ({
        companyName: row['Company Name'] || row['companyName'] || row['Company'] || '',
        contactName: row['Contact Name'] || row['contactName'] || row['Contact'] || '',
        phone: row['Phone'] || row['phone'] || '',
        email: row['Email'] || row['email'] || '',
        provider: row['Provider'] || row['provider'] || '',
        processingVolume: row['Processing Volume'] || row['processingVolume'] || '',
        effectiveRate: row['Effective Rate'] || row['effectiveRate'] || '',
        dataSource: row['Data Source'] || row['dataSource'] || row['Source'] || 'Bulk Import',
        dataCohort: row['Data Cohort'] || row['dataCohort'] || row['Cohort'] || new Date().toISOString().split('T')[0],
      }));

      const result = await bulkImport.mutateAsync({ leads });
      if (result.failed > 0) {
        toast.warning(`Imported ${result.success} leads. ${result.failed} failed.`);
      } else {
        toast.success(`Successfully imported ${result.success} leads!`);
      }
      setFile(null);
      setPreview([]);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to import leads");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Leads</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file (.xlsx, .xls) with lead data. The file should include columns: Company Name, Contact Name, Phone, Email, Provider, Processing Volume, Effective Rate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select File (CSV or Excel)</Label>
            <input
              id="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map(key => (
                        <th key={key} className="px-4 py-2 text-left font-medium">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className="px-4 py-2">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? "Importing..." : "Import Leads"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
