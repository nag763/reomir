#!/bin/bash

# --- Configuration ---
temp_dir="/tmp/reomir_functions_pkg" # Changed to be more specific
bucket_name="reomir-function-bucket" # Define your bucket name here
gcp_region="europe-west1"
gcp_runtime="python313" # Or your preferred python version like python313

# --- Helper Functions ---

# Function to display help message
usage() {
    echo "Usage: $0 [ACTION] [ARGUMENT]"
    echo ""
    echo "Actions:"
    echo "  init                      Zips each subdirectory in the current location and uploads it to GCS."
    echo "  deploy <dirname>          Deploys the specified subdirectory as a Google Cloud Function."
    echo "                            The script will cd into <dirname> before deploying."
    echo "  help                      Shows this help message."
    echo ""
    echo "Examples:"
    echo "  $0 init                   # Initializes all function packages"
    echo "  $0 deploy my_function     # Deploys the 'my_function' directory"
    exit 1
}

# Function to perform the init action
perform_init() {
    echo "🚀 Starting initialization process..."

    # Ensure the temp directory exists
    mkdir -p "$temp_dir"
    echo "Temporary directory for zip files: $temp_dir"

    local processed_count=0
    local error_count=0

    # Loop through all directories in the current location
    for dir_path in ./*/ ; do
        # Check if it's actually a directory
        if [ -d "$dir_path" ]; then
            # Remove the trailing slash for basename and zipping
            local dir_path_no_slash=${dir_path%/}
            # Get just the directory name
            local dir_name
            dir_name=$(basename "$dir_path_no_slash")

            # Construct the zip file name using the directory name
            local zip_file="$temp_dir/reomir-${dir_name}.zip"

            echo ""
            echo "-----------------------------------------------------"
            echo "⚙️ Processing directory: $dir_name"
            echo "-----------------------------------------------------"

            # Go into the directory, zip its contents, and come back out
            (
                cd "$dir_path_no_slash" || { echo "❌ ERROR: Could not cd into $dir_path_no_slash. Skipping."; exit 1; }
                echo "📦 Zipping contents to $zip_file ..."
                # -r for recursive, -q for quiet.
                # Removed -j: -j junks paths, which is usually not desired for Cloud Functions
                # as it flattens the directory structure within the zip.
                # If you need a flat structure, add -j back: zip -r -j -q "$zip_file" .
                zip -r -q "$zip_file" . -x ".git/*" -x "*.DS_Store" -x "__pycache__/*"
            )

            # Check if zip was successful
            if [ $? -eq 0 ]; then
                echo "✅ Zip created successfully: $zip_file"
                echo "☁️ Uploading $zip_file to gs://$bucket_name/..."
                if gsutil cp "$zip_file" "gs://$bucket_name/"; then
                    echo "⬆️ Upload successful for $dir_name."
                    processed_count=$((processed_count + 1))
                else
                    echo "❌ ERROR: Failed to upload $zip_file for directory $dir_name."
                    error_count=$((error_count + 1))
                fi
            else
                echo "❌ ERROR: Failed to zip directory: $dir_name"
                error_count=$((error_count + 1))
            fi
        fi
    done

    echo ""
    echo "====================================================="
    echo "🏁 Initialization complete."
    echo "Total directories processed: $processed_count"
    if [ "$error_count" -gt 0 ]; then
        echo "⚠️  Encountered $error_count error(s)."
    else
        echo "🎉 All operations successful!"
    fi
    echo "====================================================="
    # Optional: Clean up temp directory after init
    # read -p "Do you want to remove the temporary directory $temp_dir? (y/N): " confirm_cleanup
    # if [[ "$confirm_cleanup" =~ ^[Yy]$ ]]; then
    #     rm -rf "$temp_dir"
    #     echo "🧹 Temporary directory $temp_dir removed."
    # fi
}

# Function to perform the deploy action
perform_deploy() {
    local dir_to_deploy=$1
    local function_name="reomir-${dir_to_deploy}"

    if [ -z "$dir_to_deploy" ]; then
        echo "❌ ERROR: Directory name for deployment is missing."
        usage
    fi

    if [ ! -d "$dir_to_deploy" ]; then
        echo "❌ ERROR: Directory '$dir_to_deploy' not found in the current location."
        exit 1
    fi

    echo "🚀 Deploying function '$function_name' from directory '$dir_to_deploy'..."

    # Navigate into the directory to deploy from
    (
        cd "$dir_to_deploy" || { echo "❌ ERROR: Could not cd into $dir_to_deploy."; exit 1; }

        echo "📦 Preparing to deploy from $(pwd)..."
        echo "Running command: gcloud functions deploy \"$function_name\" \\"
        echo "  --gen2 \\"
        echo "  --runtime=\"$gcp_runtime\" \\"
        echo "  --region=\"$gcp_region\"     \\"
        echo "  --source=$dir_to_deploy \\"
        echo "  --entry-point=handler \\"
        echo "  --trigger-http \\" # Assuming HTTP trigger, add or modify as needed


        gcloud functions deploy "$function_name" \
            --gen2 \
            --runtime="$gcp_runtime" \
            --region="$gcp_region" \
            --source=. \
            --entry-point=handler \
            --trigger-http \
            --allow-unauthenticated # Add other flags like --env-vars-file, etc. as needed

        if [ $? -eq 0 ]; then
            echo "✅ Successfully deployed function '$function_name'."
        else
            echo "❌ ERROR: Failed to deploy function '$function_name'."
            # Consider exiting the subshell with an error code if gcloud fails
            exit 1
        fi
    )
    # Capture the exit status of the subshell
    local subshell_exit_status=$?
    if [ $subshell_exit_status -ne 0 ]; then
        echo "⚠️ Deployment process for '$function_name' encountered an error."
        exit $subshell_exit_status
    fi

    echo "🎉 Deployment attempt finished for '$function_name'."
}

# --- Main Script Logic ---

# Check if any argument is provided
if [ $# -eq 0 ]; then
    echo "❌ ERROR: No action specified."
    usage
fi

ACTION=$1
ARGUMENT=$2

case "$ACTION" in
    init)
        perform_init
        ;;
    deploy)
        perform_deploy "$ARGUMENT"
        ;;
    help)
        usage
        ;;
    *)
        echo "❌ ERROR: Unknown action '$ACTION'."
        usage
        ;;
esac

exit 0