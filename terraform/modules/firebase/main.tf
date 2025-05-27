resource "google_firebase_project" "reomir_firebase" {
  provider = google-beta
  project  = var.gcp_project

}

resource "google_firestore_database" "database" {
  project     = var.gcp_project
  name        = "(default)"
  location_id = var.region         # Use the same region as App Engine
  type        = "FIRESTORE_NATIVE" # Use Native Mode
}

resource "google_firebase_web_app" "reomir_web_app" {
  provider     = google-beta
  project      = var.gcp_project
  display_name = "reomir Web App"

  depends_on = [google_firebase_project.reomir_firebase]
}

resource "google_firebaserules_ruleset" "firestore_rules" {
  for_each = toset(var.firestore_rules)
  project  = var.gcp_project
  source {
    files {
      content = file(each.key)
      name    = each.key
    }
  }
}

resource "google_firebaserules_release" "firestore_release" {
  for_each     = google_firebaserules_ruleset.firestore_rules
  project      = var.gcp_project
  name         = "cloud.firestore"
  ruleset_name = each.value.name

  lifecycle {
    replace_triggered_by = [
      google_firebaserules_ruleset.firestore_rules[each.key].id
    ]
  }
}

output "firebase_app_id" {
  value = google_firebase_web_app.reomir_web_app.app_id
}
