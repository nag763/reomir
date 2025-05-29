#!/bin/bash

# Define the temporary directory and bucket name
temp_dir="/tmp/functions"
bucket_name="reomir-function-bucket" # Define your bucket name here

# Ensure the temp directory exists
mkdir -p "$temp_dir"

# Loop through all directories (items ending with /) in the current location
for dir in ./*/ ; do
    # Check if it's actually a directory (though */ should ensure this)
    if [ -d "$dir" ]; then
        # Remove the trailing slash for basename and zipping
        dir_path_no_slash=${dir%/}
        # Get just the directory name (this addresses your L16 request)
        dir_name=$(basename "$dir_path_no_slash")

        # Construct the zip file name using the directory name
        zip_file="$temp_dir/reomir-${dir_name}.zip"

        echo "Processing directory: $dir_path_no_slash"

        # Go into the directory, zip its contents, and come back out
        (
            cd "$dir_path_no_slash" || exit 1 # Exit subshell on error
            echo "Zipping contents to $zip_file"
            # -r for recursive, -q for quiet, . for current dir contents
            zip -r -j -q "$zip_file" .
        )

        # Check if zip was successful (subshell would exit on cd fail, check zip exit)
        if [ $? -eq 0 ]; then
            echo "Uploading $zip_file to gs://$bucket_name/"
            gsutil cp "$zip_file" "gs://$bucket_name/"
        else
            echo "Failed to zip directory: $dir_path_no_slash"
        fi
        echo "---" # Separator
    fi
done

echo "All directories processed."
exit 0