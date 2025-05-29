import functions_framework
from flask import request


# Register this function as an HTTP-triggered function
@functions_framework.http
def handler(req: request):
    request_json = req.get_json(silent=True)
    request_args = req.args

    if request_json and "name" in request_json:
        name = request_json["name"]
    elif request_args and "name" in request_args:
        name = request_args["name"]
    else:
        name = "World"

    return f"Hello, {name} from Python Cloud Functions!"
