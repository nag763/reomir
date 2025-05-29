import os

import functions_framework
from flask import request

allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*")

headers = {
    "Access-Control-Allow-Origin": allowed_origins,
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "3600",
}


# Register this function as an HTTP-triggered function
@functions_framework.http
def handler(req: request):
    # Set CORS headers for the preflight request
    if request.method == "OPTIONS":
        return ("", 204, headers)
    elif request.method == "GET":
        request_json = request.get_json(silent=True)
        request_args = request.args
        if request_json and "name" in request_json:
            name = request_json["name"]
        elif request_args and "name" in request_args:
            name = request_args["name"]
        else:
            name = "World"

        return (
            f"Hello, {name} from {allowed_origins} Python Cloud Functions!",
            200,
            headers,
        )
    else:
        return (
            "Method not allowed. Please use GET or OPTIONS.",
            405,
            {"Allow": "GET, OPTIONS"},
        )
