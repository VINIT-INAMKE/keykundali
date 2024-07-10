const firebaseConfig = {
  apiKey: "AIzaSyCIVjM5UKxI1Iyo6eLkXERnzzMsDnKf3TY",

  authDomain: "keykundali.firebaseapp.com",

  projectId: "keykundali",

  storageBucket: "keykundali.appspot.com",

  messagingSenderId: "70014599967",

  appId: "1:70014599967:web:5c545983b2639f2f16e62a",
};
firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
var storage = firebase.storage();
var storageRef = storage.ref();

// Handle reserved category toggle
document
  .getElementById("reservedCategory")
  ?.addEventListener("change", function () {
    var reservedCategory = this.value;
    var reservedCategoryFiles = document.getElementById(
      "reservedCategoryFiles"
    );

    if (reservedCategory === "yes") {
      reservedCategoryFiles.classList.remove("hidden");
    } else {
      reservedCategoryFiles.classList.add("hidden");
    }
  });

// Setup FilePond
document.addEventListener("DOMContentLoaded", function () {
  FilePond.registerPlugin(
    FilePondPluginFileValidateSize,
    FilePondPluginImagePreview,
    FilePondPluginFileValidateType
  );

  const filePondElements = [
    "filePondArcLetter",
    "filePondCetScoreCard",
    "filePondJeeScoreCard",
    "filePondSscMarkList",
    "filePondHscMarkList",
    "filePondTransferCertificate",
    "filePondDomicileCertificate",
    "filePondIncomeCertificate",
    "filePondEwsCertificate",
    "filePondGapCertificate",
    "filePondAadhaarXerox",
    "filePondCasteCertificate",
    "filePondCasteValidityCertificate",
    "filePondNonCreamyLayerCertificate",
    "filePondCandidatePhoto",
  ];

  filePondElements.forEach((id) => {
    FilePond.create(document.getElementById(id), {
      labelIdle: `Drag & Drop your file or <span class="filepond--label-action">Browse</span>`,
      acceptedFileTypes: ["application/pdf", "image/*"],
      maxFileSize: "256KB",
      credits: false,
    });
  });

  // Handle form submission
  document
    .getElementById("admissionForm")
    ?.addEventListener("submit", function (event) {
      event.preventDefault();

      var formData = new FormData(event.target);
      var uploadPromises = [];
      var formObject = Object.fromEntries(formData.entries());
      var email = formObject.email.trim();
      var password = formObject.password.trim();

      // Ensure password is a string
      if (typeof password !== "string" || password.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Password must be a valid string.",
          showCloseButton: true,
          confirmButtonText: "OK",
        });
        return;
      }

      // Create user with email and password
      firebase
        .auth()
        .createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          var userId = userCredential.user.uid;

          filePondElements.forEach((id) => {
            var file = FilePond.find(document.getElementById(id)).getFiles()[0];
            if (file) {
              var storageRef = storage
                .ref()
                .child(`uploads/${userId}/${id}/${file.file.name}`);
              uploadPromises.push(
                storageRef
                  .put(file.file)
                  .then((snapshot) => snapshot.ref.getDownloadURL())
              );
            }
          });

          return Promise.all(uploadPromises)
            .then((urls) => {
              urls.forEach((url, index) => {
                formObject[filePondElements[index]] = url;
              });

              delete formObject.password; // Remove password before saving to Firestore

              return db.collection("students").doc(userId).set(formObject);
            })
            .then(() => {
              firebase
                .auth()
                .signInWithEmailAndPassword(email, password)
                .then(() => {
                  window.location.href = "index.html";
                });
            })
            .catch((error) => {
              console.error("Error submitting form: ", error);
              Swal.fire({
                icon: "error",
                title: "Error!",
                text: "Failed to submit form. Please try again.",
                showCloseButton: true,
                confirmButtonText: "OK",
              });
            });
        })
        .catch((error) => {
          console.error("Error creating user: ", error);
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Failed to create user. Please try again.",
            showCloseButton: true,
            confirmButtonText: "OK",
          });
        });
    });

  // Handle login form submission
  document
    .getElementById("loginForm")
    ?.addEventListener("submit", function (event) {
      event.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();

      // Ensure password is a string
      if (typeof password !== "string" || password.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Password must be a valid string.",
          showCloseButton: true,
          confirmButtonText: "OK",
        });
        return;
      }

      firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then(() => {
          window.location.href = "index.html";
        })
        .catch((error) => {
          console.error("Error logging in: ", error);
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Failed to login. Please try again.",
            showCloseButton: true,
            confirmButtonText: "OK",
          });
        });
    });

  showMenu("nav-toggle", "nav-menu");

  // Display Profile Picture and Dropdown
  firebase.auth().onAuthStateChanged((user) => {
    const navMenu = document.getElementById("nav-menu");
    const loginLink = document.getElementById("loginLink");
    const registerLink = document.getElementById("registerLink");
    const profileMenu = document.querySelector(".profile-menu");

    if (user) {
      db.collection("students")
        .doc(user.uid)
        .get()
        .then((doc) => {
          if (doc.exists) {
            document.getElementById("profilePicture").src =
              doc.data().filePondCandidatePhoto;
            document.getElementById("uname").innerHTML = doc.data().firstName;
            profileMenu.style.display = "inline-block";
            loginLink.style.display = "none";
            registerLink.style.display = "none";
          } else {
            console.log("No such document!");
          }
        })
        .catch((error) => {
          console.log("Error getting document:", error);
        });
    } else {
      profileMenu.style.display = "none";
      loginLink.style.display = "inline-block";
      registerLink.style.display = "inline-block";
    }
  });

  // Handle Logout
  document
    .getElementById("logout")
    ?.addEventListener("click", function (event) {
      event.preventDefault();
      firebase
        .auth()
        .signOut()
        .then(() => {
          window.location.href = "login.html";
        })
        .catch((error) => {
          console.error("Error logging out: ", error);
        });
    });

  // Load Profile Information
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      if (window.location.pathname.endsWith("profile.html")) {
        db.collection("students")
          .doc(user.uid)
          .get()
          .then((doc) => {
            if (doc.exists) {
              var data = doc.data();
              var profileInfo2 = ``;
              var profileInfo = `
              <h4 class="font-weight-bold py-3 mb-4">Profile Information</h4>
<div class="card overflow-hidden">
  <div class="row no-gutters row-bordered row-border-light">
    <div class="col-md-3 pt-0">
      <div class="list-group list-group-flush account-settings-links">
        <a
          class="list-group-item list-group-item-action active"
          data-toggle="list"
          href="#account-general"
          >General</a
        >
         <a
                class="list-group-item list-group-item-action"
                data-toggle="list"
                href="#account-documents"
                >Documents</a
              >
      </div>
    </div>
    <div class="col-md-9">
      <div class="tab-content">
        <div class="tab-pane fade active show" id="account-general">
          <div class="card-body media align-items-center">
            <img
              src="${data.filePondCandidatePhoto}"
              alt="Candidate Photo"
              class="d-block ui-w-80"
            />
          </div>
          <hr class="border-light m-0" />
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">First Name:</label>
              <input
                type="text"
                class="form-control mb-1" disabled
                value="${data.firstName} "
              />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.surname}" />
            </div>
            <div class="form-group">
              <label class="form-label">E-mail:</label>
              <input
                type="text"
                class="form-control mb-1"
                disabled

                value="${data.email}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Branch:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.branch}" />
            </div>
            <div class="form-group">
              <label class="form-label">Mobile:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.mobile}" />
            </div>
            <div class="form-group">
              <label class="form-label">Date of Birth:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.dob}" />
            </div>
            <div class="form-group">
              <label class="form-label">Sex:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.sex}" />
            </div>

            <div class="form-group">
              <label class="form-label">Blood Group:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.bloodGroup}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Religion:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.religion}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Category:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.category}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Caste:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.caste}" />
            </div>
            <div class="form-group">
              <label class="form-label">Aadhaar:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.aadhaar}" />
            </div>
            <div class="form-group">
              <label class="form-label">Annual Income:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.income}" />
            </div>
            <div class="form-group">
              <label class="form-label">Mother's Name:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.motherName}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Mother's Occupation:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.motherOccupation}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Mother's Mobile:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.motherMobile}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Father's Name:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.fatherName}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Father's Occupation:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.fatherOccupation}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Father's Mobile:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.fatherMobile}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Permanent Address:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.permanentAddress}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Permanent Pin:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.permanentPin}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Guardian's Name:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.guardianName}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Local Address:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.localAddress}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Local Pin:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.localPin}"

              />
            </div>
            <div class="form-group">
              <label class="form-label">Guardian's Occupation:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.guardianOccupation}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Guardian's Mobile:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.guardianMobile}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Month and Year of Passing:</label>
              <input
                 type="text"
                class="form-control"
                disabled
                value="${data.passingYear}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Institution Name and Address:</label>
              <input
                 type="text"
                class="form-control"
                disabled
         
                value="${data.instNameAdd}"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Passed from Maharashtra:</label> <input
                 type="text"
                class="form-control"
                disabled value="${data.passMah}" />
            </div>
          </div>
        </div>
<div class="tab-pane fade" id="account-documents">
      
</div>
      </div>
    </div>
  </div>
</div>


    
              
                          
                        `;

              // Document previews
              const docFields = [
                "filePondArcLetter",
                "filePondCetScoreCard",
                "filePondJeeScoreCard",
                "filePondSscMarkList",
                "filePondHscMarkList",
                "filePondTransferCertificate",
                "filePondDomicileCertificate",
                "filePondIncomeCertificate",
                "filePondEwsCertificate",
                "filePondGapCertificate",
                "filePondAadhaarXerox",
              ];

              docFields.forEach((field) => {
                if (data[field]) {
                  profileInfo2 += `
                            
                <div class="card-body pb-2">
                  <div class="form-group">
                    <label>${field
                      .replace("filePond", "")
                      .replace(/([A-Z])/g, " $1")}:</label>
                    <p><a href="${
                      data[field]
                    }" target="_blank">View Document</a></p>
                  </div>                 
                </div>
             
     
                                `;
                }
              });

              document.getElementById("profileInfo").innerHTML = profileInfo;
              document.getElementById("account-documents").innerHTML =
                profileInfo2;
              account - documents;
            } else {
              console.log("No such document!");
            }
          })
          .catch((error) => {
            console.log("Error getting document:", error);
          });
      }
    } else {
      if (
        !window.location.pathname.endsWith("login.html") &&
        !window.location.pathname.endsWith("register.html")
      ) {
        window.location.href = "login.html";
      }
    }
  });
});
