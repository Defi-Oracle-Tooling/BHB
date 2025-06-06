#!/bin/zsh

# 1. Identify all downloaded README files
echo "Identifying all *_README.md files..."
readme_files=(*_README.md)

# 2. Batch summarize or analyze content
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "Summary Report - Generated on $timestamp" > readme_summaries.txt
error_log="readme_errors.log"
> "$error_log"

for file in "${readme_files[@]}"; do
  echo "==== $file ====" >> readme_summaries.txt
  # Extract the first non-empty paragraph as a short summary
  if [[ -r "$file" ]]; then
    summary=$(awk 'BEGIN{RS=""} NR==1{gsub(/\n/," "); print; exit}' "$file")
    if [[ -z "$summary" ]]; then
      summary="No summary available."
    fi
    echo "$summary" >> readme_summaries.txt
  else
    echo "[ERROR] Could not read $file" >> "$error_log"
    echo "No summary available (file not readable)." >> readme_summaries.txt
  fi
  echo >> readme_summaries.txt
done
echo "Short summaries written to readme_summaries.txt"
if [[ -s "$error_log" ]]; then
  echo "Some files could not be processed. See $error_log for details."
fi

# 3. Detect and list empty or nearly empty files
echo "Detecting empty or nearly empty README files..."
find . -name '*_README.md' -size -1k > empty_readmes.txt
echo "List of empty or nearly empty README files written to empty_readmes.txt"

# 4. Organize or archive
echo "Organizing README files into ./readmes directory..."
mkdir -p readmes
mv *_README.md readmes/
echo "All README files moved to ./readmes/"

# 5. Further processing (optional): Convert all README files to HTML using pandoc (if installed)
echo "Converting README files to HTML (if pandoc is installed)..."
for file in readmes/*_README.md; do
  if command -v pandoc > /dev/null; then
    pandoc "$file" -o "${file%.md}.html"
  fi
done
echo "Conversion to HTML complete (if pandoc was available)."

# 6. Archive all README files
echo "Archiving all README files into all_readmes.tar.gz..."
tar czf all_readmes.tar.gz -C readmes .
echo "Archive created: all_readmes.tar.gz"

# 7. Clean up (optional): Uncomment the next line to remove the readmes directory after archiving
# rm -rf readmes

echo "All tasks complete."
