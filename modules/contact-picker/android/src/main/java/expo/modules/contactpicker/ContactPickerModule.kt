package expo.modules.contactpicker

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.ContactsContract
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.Serializable
import java.util.concurrent.atomic.AtomicBoolean

/** Launcher input. Must be Serializable so Expo can persist it across Activity recreation. */
class PickPhoneInput : Serializable

/**
 * Opens the system contact picker filtered to phone numbers. The contacts app grants
 * this app temporary read access to the returned data row, so no READ_CONTACTS
 * permission is needed (it is blocked in app.json).
 */
class PickPhoneContract : AppContextActivityResultContract<PickPhoneInput, Uri?> {
  override fun createIntent(context: Context, input: PickPhoneInput): Intent =
    Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI)

  override fun parseResult(input: PickPhoneInput, resultCode: Int, intent: Intent?): Uri? =
    if (resultCode == Activity.RESULT_OK) {
      intent?.data
    } else {
      null
    }
}

class NoContactsAppException(cause: Throwable? = null) :
  CodedException("No app on this device can pick a contact's phone number.", cause)

class PickInProgressException :
  CodedException("A contact pick is already in progress.")

class UnreadableContactException :
  CodedException("The picked contact could not be read.")

class ContactPickerModule : Module() {
  private lateinit var pickPhoneLauncher: AppContextActivityResultLauncher<PickPhoneInput, Uri?>
  private val isPicking = AtomicBoolean(false)

  override fun definition() = ModuleDefinition {
    // JS: requireOptionalNativeModule('ContactPicker')
    Name("ContactPicker")

    RegisterActivityContracts {
      pickPhoneLauncher = registerForActivityResult(PickPhoneContract())
    }

    // Resolves { name, phone } or null when the user backs out of the picker.
    AsyncFunction("pickPhone") Coroutine { ->
      pickPhone()
    }
  }

  private suspend fun pickPhone(): Map<String, String>? {
    if (!isPicking.compareAndSet(false, true)) {
      throw PickInProgressException()
    }
    try {
      val picked: Uri? = try {
        pickPhoneLauncher.launch(PickPhoneInput())
      } catch (e: ActivityNotFoundException) {
        throw NoContactsAppException(e)
      }
      val uri: Uri = picked ?: return null

      return withContext(Dispatchers.IO) {
        readPhone(uri)
      }
    } finally {
      isPicking.set(false)
    }
  }

  private fun readPhone(uri: Uri): Map<String, String> {
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    val nameColumn = ContactsContract.Data.DISPLAY_NAME
    val numberColumn = ContactsContract.CommonDataKinds.Phone.NUMBER
    val cursor = context.contentResolver.query(uri, arrayOf(nameColumn, numberColumn), null, null, null)
      ?: throw UnreadableContactException()

    return cursor.use { row ->
      if (!row.moveToFirst()) {
        throw UnreadableContactException()
      }
      val nameIndex = row.getColumnIndex(nameColumn)
      val numberIndex = row.getColumnIndex(numberColumn)
      val name: String? = if (nameIndex >= 0) row.getString(nameIndex) else null
      val number: String? = if (numberIndex >= 0) row.getString(numberIndex) else null
      mapOf(
        "name" to (name ?: "").trim(),
        "phone" to (number ?: "").trim()
      )
    }
  }
}
